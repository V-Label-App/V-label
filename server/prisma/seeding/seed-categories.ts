import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const CATEGORIES = [
    { name: 'Medical', description: 'Healthcare and medical imaging datasets' },
    { name: 'Traffic', description: 'Autonomous driving and traffic monitoring' },
    { name: 'Agriculture', description: 'Crop monitoring and plant disease detection' },
    { name: 'Retail', description: 'Product recognition and shelf monitoring' },
    { name: 'Manufacturing', description: 'Defect detection and industrial automation' },
    { name: 'Security', description: 'Surveillance and intrusion detection' },
]

async function main() {
    console.log('🌱 Seeding Project Categories...')

    for (const category of CATEGORIES) {
        const existing = await prisma.projectCategory.findUnique({
            where: { name: category.name },
        })

        if (!existing) {
            await prisma.projectCategory.create({
                data: category,
            })
            console.log(`✅ Created category: ${category.name}`)
        } else {
            console.log(`ℹ️ Category already exists: ${category.name}`)
        }
    }

    console.log('✨ Category seeding completed.')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
