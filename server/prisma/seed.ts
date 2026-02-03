import { PrismaClient, UserRole, ProjectStatus } from '@prisma/client'
import { hashPassword } from '../src/utils/password.utils.js'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Create test users for development
  console.log('\n👥 Creating users...')
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

  const users: any = {}
  for (const userData of testUsers) {
    const existingUser = await prisma.user.findUnique({
      where: { email: userData.email },
    })

    if (existingUser) {
      console.log(`  ⏭️  User ${userData.email} already exists`)
      users[userData.role] = existingUser
      continue
    }

    const hashedPassword = await hashPassword(userData.password)

    const user = await prisma.user.create({
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

    users[userData.role] = user
    console.log(`  ✅ Created user: ${userData.email} (${userData.role})`)
  }

  // Create label categories
  console.log('\n📁 Creating label categories...')
  const categories = [
    {
      name: 'Objects',
      description: 'Common objects and items',
      color: '#3B82F6',
    },
    {
      name: 'Vehicles',
      description: 'Transportation and vehicles',
      color: '#10B981',
    },
    {
      name: 'Animals',
      description: 'Animals and pets',
      color: '#F59E0B',
    },
    {
      name: 'People',
      description: 'Human-related labels',
      color: '#EF4444',
    },
  ]

  const createdCategories: any = {}
  for (const categoryData of categories) {
    const existingCategory = await prisma.labelCategory.findFirst({
      where: { name: categoryData.name },
    })

    if (existingCategory) {
      console.log(`  ⏭️  Category ${categoryData.name} already exists`)
      createdCategories[categoryData.name] = existingCategory
      continue
    }

    const category = await prisma.labelCategory.create({
      data: categoryData,
    })

    createdCategories[categoryData.name] = category
    console.log(`  ✅ Created category: ${categoryData.name}`)
  }

  // Create labels
  console.log('\n🏷️  Creating labels...')
  const labels = [
    // Objects
    { name: 'Chair', color: '#3B82F6', isGlobal: true, category: 'Objects' },
    { name: 'Table', color: '#2563EB', isGlobal: true, category: 'Objects' },
    { name: 'Laptop', color: '#1D4ED8', isGlobal: true, category: 'Objects' },
    { name: 'Phone', color: '#1E40AF', isGlobal: true, category: 'Objects' },

    // Vehicles
    { name: 'Car', color: '#10B981', isGlobal: true, category: 'Vehicles' },
    { name: 'Bus', color: '#059669', isGlobal: true, category: 'Vehicles' },
    { name: 'Truck', color: '#047857', isGlobal: true, category: 'Vehicles' },
    {
      name: 'Motorcycle',
      color: '#065F46',
      isGlobal: true,
      category: 'Vehicles',
    },

    // Animals
    { name: 'Dog', color: '#F59E0B', isGlobal: true, category: 'Animals' },
    { name: 'Cat', color: '#D97706', isGlobal: true, category: 'Animals' },
    { name: 'Bird', color: '#B45309', isGlobal: true, category: 'Animals' },
    { name: 'Horse', color: '#92400E', isGlobal: true, category: 'Animals' },

    // People
    { name: 'Person', color: '#EF4444', isGlobal: true, category: 'People' },
    { name: 'Face', color: '#DC2626', isGlobal: true, category: 'People' },
    { name: 'Hand', color: '#B91C1C', isGlobal: true, category: 'People' },

    // Uncategorized
    { name: 'Background', color: '#6B7280', isGlobal: true, category: null },
    { name: 'Unknown', color: '#9CA3AF', isGlobal: true, category: null },
  ]

  const createdLabels: any[] = []
  for (const labelData of labels) {
    const existingLabel = await prisma.label.findFirst({
      where: { name: labelData.name },
    })

    if (existingLabel) {
      console.log(`  ⏭️  Label ${labelData.name} already exists`)
      createdLabels.push(existingLabel)
      continue
    }

    const label = await prisma.label.create({
      data: {
        name: labelData.name,
        color: labelData.color,
        isGlobal: labelData.isGlobal,
        categoryId: labelData.category
          ? createdCategories[labelData.category]?.id
          : null,
      },
    })

    createdLabels.push(label)
    console.log(`  ✅ Created label: ${labelData.name}`)
  }

  // Create projects
  console.log('\n📋 Creating projects...')
  const manager = users[UserRole.MANAGER]

  // Create project categories first
  const projectCategories = [
    {
      name: 'Object Detection',
      description:
        'Projects focused on detecting and locating objects in images',
    },
    {
      name: 'Image Classification',
      description: 'Projects for categorizing entire images',
    },
    {
      name: 'Segmentation',
      description: 'Projects for pixel-level image segmentation',
    },
  ]

  const createdProjectCategories: any = {}
  for (const catData of projectCategories) {
    const existingCat = await prisma.projectCategory.findUnique({
      where: { name: catData.name },
    })

    if (existingCat) {
      console.log(`  ⏭️  Project category ${catData.name} already exists`)
      createdProjectCategories[catData.name] = existingCat
      continue
    }

    const cat = await prisma.projectCategory.create({
      data: catData,
    })

    createdProjectCategories[catData.name] = cat
    console.log(`  ✅ Created project category: ${catData.name}`)
  }

  const projects = [
    {
      name: 'Traffic Detection Dataset',
      description: 'Dataset for traffic monitoring and vehicle detection',
      categoryName: 'Object Detection',
      status: ProjectStatus.ACTIVE,
      deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    },
    {
      name: 'Pet Recognition System',
      description: 'Dataset for pet identification and classification',
      categoryName: 'Image Classification',
      status: ProjectStatus.ACTIVE,
      deadline: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
    },
    {
      name: 'Indoor Object Segmentation',
      description: 'Semantic segmentation for indoor scenes',
      categoryName: 'Segmentation',
      status: ProjectStatus.PAUSED,
      deadline: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), // 45 days from now
    },
  ]

  for (const projectData of projects) {
    let project = await prisma.project.findFirst({
      where: { name: projectData.name },
    })

    if (project) {
      console.log(`  ⏭️  Project ${projectData.name} already exists`)

      // Ensure manager is a member even for existing projects
      const existingMember = await prisma.projectMember.findFirst({
        where: {
          projectId: project.id,
          userId: manager.id,
        },
      })

      if (!existingMember) {
        await prisma.projectMember.create({
          data: {
            projectId: project.id,
            userId: manager.id,
            projectRole: 'MANAGER',
          },
        })
        console.log(
          `    ↳ Added ${manager.fullName} as MANAGER to existing project`,
        )
      } else {
        console.log(`    ↳ ${manager.fullName} is already a member`)
      }

      continue
    }

    const { categoryName, ...rest } = projectData
    project = await prisma.project.create({
      data: {
        ...rest,
        categoryId: createdProjectCategories[categoryName]?.id,
      },
    })

    console.log(`  ✅ Created project: ${projectData.name}`)

    // Add manager as project member with MANAGER role
    await prisma.projectMember.create({
      data: {
        projectId: project.id,
        userId: manager.id,
        projectRole: 'MANAGER',
      },
    })
    console.log(`    ↳ Added ${manager.fullName} as MANAGER`)

    // Assign relevant labels to projects
    let labelsToAssign: any[] = []
    if (project.name.includes('Traffic')) {
      labelsToAssign = createdLabels.filter((l) =>
        ['Car', 'Bus', 'Truck', 'Motorcycle', 'Person'].includes(l.name),
      )
    } else if (project.name.includes('Pet')) {
      labelsToAssign = createdLabels.filter((l) =>
        ['Dog', 'Cat', 'Bird'].includes(l.name),
      )
    } else if (project.name.includes('Indoor')) {
      labelsToAssign = createdLabels.filter((l) =>
        ['Chair', 'Table', 'Laptop', 'Phone', 'Person'].includes(l.name),
      )
    }

    for (const label of labelsToAssign) {
      await prisma.projectLabel.create({
        data: {
          projectId: project.id,
          labelId: label.id,
        },
      })
    }

    console.log(`    ↳ Assigned ${labelsToAssign.length} labels`)
  }

  console.log('\n✅ Seeding completed!')
  console.log('\n📊 Summary:')
  console.log(`  - Users: ${testUsers.length}`)
  console.log(`  - Categories: ${categories.length}`)
  console.log(`  - Labels: ${labels.length}`)
  console.log(`  - Projects: ${projects.length}`)
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
