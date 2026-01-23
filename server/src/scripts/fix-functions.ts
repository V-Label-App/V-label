import { prisma } from '../utils/database.js';

async function fixFunctions() {
  console.log('Fixing function configurations...');

  // Get system config
  const config = await prisma.systemConfig.findFirst();

  if (!config) {
    console.error('No system config found!');
    return;
  }

  console.log('Current config ID:', config.id);

  // Parse functions
  const functions = config.chatConfig ? (config.chatConfig as any).functions || [] : [];
  console.log('Current functions:', functions.length);

  // Update all functions to be enabled for MANAGER role
  const updatedFunctions = functions.map((fn: any) => {
    const currentRoles = Array.isArray(fn.roles) ? fn.roles : [];

    // Ensure MANAGER is in roles array
    if (!currentRoles.includes('MANAGER')) {
      currentRoles.push('MANAGER');
    }

    // Also ensure ADMIN is in roles
    if (!currentRoles.includes('ADMIN')) {
      currentRoles.push('ADMIN');
    }

    return {
      ...fn,
      enabled: true, // Enable all functions
      roles: currentRoles
    };
  });

  console.log('Updated functions:', updatedFunctions.map((f: any) => ({
    name: f.name,
    enabled: f.enabled,
    roles: f.roles
  })));

  // Update database
  await prisma.systemConfig.update({
    where: { id: config.id },
    data: {
      chatConfig: {
        ...(config.chatConfig as any),
        functions: updatedFunctions
      }
    }
  });

  console.log('✅ Functions updated successfully!');
  console.log('All functions are now enabled for MANAGER and ADMIN roles.');
}

fixFunctions()
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
