import { PrismaClient, UserRole } from '@prisma/client'
import { hashPassword } from '../../src/utils/password.utils.js'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Create 4 test users for development
  const testUsers = [
    {
      email: 'admin@vlabel.com',
      password: '123',
      role: UserRole.ADMIN,
      fullName: 'Admin User',
    },
    {
      email: 'manager@vlabel.com',
      password: '123',
      role: UserRole.MANAGER,
      fullName: 'Manager User',
    },
    {
      email: 'manager2@vlabel.com',
      password: '123',
      role: UserRole.MANAGER,
      fullName: 'Manager User 2',
    },
    {
      email: 'reviewer@vlabel.com',
      password: '123',
      role: UserRole.REVIEWER,
      fullName: 'Reviewer User',
    },
    {
      email: 'annotator@vlabel.com',
      password: '123',
      role: UserRole.ANNOTATOR,
      fullName: 'Annotator User',
    },
  ]

  for (const userData of testUsers) {
    const existingUser = await prisma.user.findUnique({
      where: { email: userData.email },
    })

    if (existingUser) {
      console.log(`  ⏭️  User ${userData.email} already exists`)
      continue
    }

    const passwordHash = await hashPassword(userData.password)
    await prisma.user.create({
      data: {
        email: userData.email,
        passwordHash,
        role: userData.role,
        fullName: userData.fullName,
        provider: 'LOCAL',
      },
    })
    console.log(`  ✅ Created ${userData.role}: ${userData.email}`)
  }

  console.log('🎉 Seeding completed!')
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
