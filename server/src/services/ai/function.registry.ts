import { prisma } from '../../utils/database.js';

type FunctionImplementation = (params: any, context?: any) => Promise<any>;

export class FunctionRegistry {
  private static registry = new Map<string, FunctionImplementation>();

  /**
   * Register a function
   */
  static register(name: string, fn: FunctionImplementation) {
    this.registry.set(name, fn);
  }

  /**
   * Get a function by name
   */
  static get(name: string) {
    return this.registry.get(name);
  }

  /**
   * Execute a function safely
   */
  static async execute(name: string, params: any, context: any) {
    const fn = this.get(name);
    if (!fn) {
      throw new Error(`Function ${name} not found`);
    }
    return await fn(params, context);
  }
}

// ==========================================
// Register Internal Tools
// ==========================================

// 1. Get User Count
FunctionRegistry.register('get_user_count', async (params, context) => {
  // Optional: Check permissions via context.userRole
  const count = await prisma.user.count();
  return { count, message: `There are currently ${count} users in the system.` };
});

// 2. Echo (Test)
FunctionRegistry.register('echo_test', async (params) => {
  return { received: params, timestamp: new Date() };
});
