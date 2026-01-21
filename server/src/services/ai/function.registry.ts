import { prisma } from '../../utils/database.js';
import bcrypt from 'bcryptjs';
import { ResponseFormatter } from './responseFormatter.js';

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
  const count = await prisma.user.count();

  return ResponseFormatter.asCard({
    title: 'System Users',
    subtitle: 'Total registered users in the system',
    icon: '',
    fields: {
      'Total Users': count,
      'Status': count > 0 ? 'Active' : 'Empty'
    },
    variant: 'default'
  });
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
  return ResponseFormatter.asText(
    `**Echo Test Result**\n\n` +
    `Received parameters:\n\`\`\`json\n${JSON.stringify(params, null, 2)}\n\`\`\`\n\n` +
    `Timestamp: ${new Date().toLocaleString('vi-VN')}`
  );
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
    select: { email: true, fullName: true, role: true, createdAt: true }
  });

  // Format dates for display
  const formattedUsers = users.map(u => ({
    Email: u.email,
    'Full Name': u.fullName,
    Role: u.role,
    Created: new Date(u.createdAt).toLocaleDateString('vi-VN')
  }));

  // Return as interactive table
  return ResponseFormatter.asTable(formattedUsers);
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

  // If missing required params, return interactive form
  if (!email || !password || !fullName) {
    return ResponseFormatter.asForm({
      id: 'create_user',
      title: 'Create New User',
      description: 'Fill in the details to create a new user account',
      fields: [
        {
          name: 'email',
          type: 'email',
          label: 'Email Address',
          placeholder: 'user@example.com',
          required: true
        },
        {
          name: 'fullName',
          type: 'text',
          label: 'Full Name',
          placeholder: 'John Doe',
          required: true
        },
        {
          name: 'password',
          type: 'password',
          label: 'Password',
          placeholder: 'Min 8 characters',
          required: true,
          minLength: 8
        },
        {
          name: 'role',
          type: 'select',
          label: 'Role',
          options: ['ADMIN', 'MANAGER', 'ANNOTATOR', 'REVIEWER'],
          defaultValue: 'ANNOTATOR'
        }
      ]
    });
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

  // Return success card
  return ResponseFormatter.asCard({
    title: '✅ User Created Successfully',
    variant: 'success',
    fields: {
      'Email': newUser.email,
      'Full Name': newUser.fullName,
      'Role': newUser.role
    },
    actions: [
      { label: 'Xem tất cả người dùng', action: 'Xem tất cả người dùng', variant: 'primary' },
      { label: 'Tạo người dùng mới', action: 'Tạo người dùng mới', variant: 'secondary' }
    ]
  });
}, {
  description: 'Create a new user account. IMPORTANT: Call this function IMMEDIATELY when user wants to create a user, even if they haven\'t provided email, password, or name yet. The function will automatically show an interactive form to collect any missing information. Do NOT ask the user for details - just call this function right away.',
  parameters: {
    type: 'object',
    properties: {
      email: { type: 'string', description: 'User email address (optional - form will ask if missing)' },
      password: { type: 'string', description: 'User password min 8 chars (optional - form will ask if missing)' },
      fullName: { type: 'string', description: 'User full name (optional - form will ask if missing)' },
      role: {
        type: 'string',
        description: 'User role: ADMIN, MANAGER, ANNOTATOR, REVIEWER (optional - defaults to ANNOTATOR)',
        enum: ['ADMIN', 'MANAGER', 'ANNOTATOR', 'REVIEWER']
      }
    }
    // No required fields - function shows form for missing params
  }
});
