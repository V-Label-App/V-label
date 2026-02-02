import { PrismaClient, UserRole } from '@prisma/client'
import { hashPassword } from '../src/utils/password.utils.js'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Create test users for development
  const testUsers = [
    {
      email: 'admin@vlabel.com',
      password: '123',
      role: UserRole.ADMIN,
      fullName: 'Admin User',
      phoneNumber: '+84 901 234 567',
    },
    {
      email: 'manager@vlabel.com',
      password: '123',
      role: UserRole.MANAGER,
      fullName: 'Manager User',
      phoneNumber: '+84 902 234 567',
    },
    {
      email: 'reviewer@vlabel.com',
      password: '123',
      role: UserRole.REVIEWER,
      fullName: 'Reviewer User',
      phoneNumber: '+84 903 234 567',
    },
    {
      email: 'annotator@vlabel.com',
      password: '123',
      role: UserRole.ANNOTATOR,
      fullName: 'Annotator User',
      phoneNumber: '+84 904 234 567',
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

    const hashedPassword = await hashPassword(userData.password)

    await prisma.user.create({
      data: {
        email: userData.email,
        passwordHash: hashedPassword,
        fullName: userData.fullName,
        phoneNumber: userData.phoneNumber,
        role: userData.role,
        isActive: true,
        provider: 'LOCAL',
      },
    })

    console.log(`  ✅ Created user: ${userData.email} (${userData.role})`)
  }

  console.log('✅ Seeding completed!')
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
