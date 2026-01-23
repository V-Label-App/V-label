import { prisma } from '../utils/database.js';

const SYSTEM_CONFIG_KEYS = {
  CHAT_WIDGET: 'chatWidget',
};

async function fixFunctions() {
  console.log('Fixing function configurations...');

  // Get system config
  const config = await prisma.systemConfig.findUnique({
    where: { key: SYSTEM_CONFIG_KEYS.CHAT_WIDGET }
  });

  if (!config) {
    console.error('No system config found!');
    return;
  }

  console.log('Current config key:', config.key);

  // Parse functions from value field
  const configValue = config.value as any;
  const functions = configValue?.functions || [];
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
    where: { key: SYSTEM_CONFIG_KEYS.CHAT_WIDGET },
    data: {
      value: {
        ...configValue,
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
