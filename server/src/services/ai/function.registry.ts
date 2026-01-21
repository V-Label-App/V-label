import { prisma } from '../../utils/database.js';
import bcrypt from 'bcryptjs';

type FunctionImplementation = (params: any, context?: any) => Promise<any>;

export interface FunctionMetadata {
  description?: string;
  parameters?: any;
}

export class FunctionRegistry {
  private static registry = new Map<string, { fn: FunctionImplementation; metadata: FunctionMetadata }>();

  /**
   * Register a function with metadata
   */
  static register(name: string, fn: FunctionImplementation, metadata: FunctionMetadata = {}) {
    this.registry.set(name, { fn, metadata });
  }

  /**
   * Get a function by name
   */
  static get(name: string) {
    return this.registry.get(name)?.fn;
  }

  /**
   * Get all registered functions metadata
   */
  static getDefinitions() {
    return Array.from(this.registry.entries()).map(([name, { metadata }]) => ({
      name,
      description: metadata.description || '',
      parameters: metadata.parameters || { type: 'object', properties: {} }
    }));
  }

  /**
   * Execute a function safely
   */
  static async execute(name: string, params: any, context: any) {
    const entry = this.registry.get(name);
    if (!entry) {
      throw new Error(`Function ${name} not found`);
    }
    return await entry.fn(params, context);
  }
}

// ==========================================
// Register Internal Tools
// ==========================================

// 1. Get User Count
// 1. Get User Count
FunctionRegistry.register('get_user_count', async (params, context) => {
  // Optional: Check permissions via context.userRole
  const count = await prisma.user.count();
  return { count, message: `There are currently ${count} users in the system.` };
}, {
  description: 'Get the total number of users in the system.',
  parameters: {
    type: 'object',
    properties: {}
  }
});

// 2. Echo (Test)
// 2. Echo (Test)
FunctionRegistry.register('echo_test', async (params) => {
  return { received: params, timestamp: new Date() };
}, {
  description: 'Echo back parameters for testing.',
  parameters: {
    type: 'object',
    properties: {
      message: { type: 'string' }
    }
  }
});

// 3. Get Users (List)
FunctionRegistry.register('get_users', async (params, context) => {
  // Security: Only allow ADMIN or MANAGER to list users
  if (!['ADMIN', 'MANAGER'].includes(context.userRole)) {
    throw new Error('Permission denied: Only ADMIN and MANAGER can list users.');
  }

  const { role, limit = 5 } = params;
  const where: any = {};
  if (role) where.role = role;

  const users = await prisma.user.findMany({
    where,
    take: Math.min(Number(limit) || 5, 20), // Max 20 to prevent overload
    select: { id: true, email: true, role: true, fullName: true, createdAt: true }
  });

  return { 
    users, 
    count: users.length, 
    total: await prisma.user.count({ where }),
    message: `Found ${users.length} users.` 
  };
}, {
  description: 'List user details including email, role, and name. Supports filtering by role.',
  parameters: {
    type: 'object',
    properties: {
      role: { type: 'string', description: 'Filter by role (ADMIN, MANAGER, ANNOTATOR, REVIEWER)', enum: ['ADMIN', 'MANAGER', 'ANNOTATOR', 'REVIEWER'] },
      limit: { type: 'number', description: 'Limit number of results (default 5, max 20)' }
    }
  }
});

// 4. Create User
FunctionRegistry.register('create_user', async (params, context) => {
  // Security: Only ADMIN can create users
  if (context.userRole !== 'ADMIN') {
    throw new Error('Permission denied: Only ADMIN can create new users.');
  }

  const { email, password, fullName, role = 'ANNOTATOR' } = params;

  // Validation
  if (!email || !password || !fullName) {
    throw new Error('Missing required fields: email, password, fullName');
  }

  // Check existence
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new Error(`User with email ${email} already exists.`);
  }

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  // Create user
  const newUser = await prisma.user.create({
    data: {
      email,
      passwordHash,
      fullName,
      role,
      isActive: true,
      provider: 'LOCAL'
    },
    select: { id: true, email: true, role: true, fullName: true }
  });

  return {
    user: newUser,
    message: `Successfully created user ${newUser.fullName} (${newUser.email}) with role ${newUser.role}.`
  };
}, {
  description: 'Create a new user in the system. Requires email, password, and full name.',
  parameters: {
    type: 'object',
    properties: {
      email: { type: 'string', description: 'User email address' },
      password: { type: 'string', description: 'User password' },
      fullName: { type: 'string', description: 'User full name' },
      role: { 
        type: 'string', 
        description: 'User role (default: ANNOTATOR)', 
        enum: ['ADMIN', 'MANAGER', 'ANNOTATOR', 'REVIEWER'] 
      }
    },
    required: ['email', 'password', 'fullName']
  }
});
