
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
            id: true,
            email: true,
            name: true,
            role: true,
            approved: true,
            createdAt: true
        }
    });

    console.log('Last 5 users:');
    console.table(users);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
