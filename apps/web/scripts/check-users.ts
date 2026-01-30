
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany({
        select: {
            id: true,
            email: true,
            name: true,
            role: true,
            approved: true,
            createdAt: true
        },
        orderBy: {
            createdAt: 'desc'
        }
    });

    console.log(`Found ${users.length} users:`);
    users.forEach((u: any) => {
        console.log(`- ${u.email} (${u.name})`);
        console.log(`  Role: ${u.role}`);
        console.log(`  Approved: ${u.approved}`);
        console.log(`  Created: ${u.createdAt.toISOString()}`);
        console.log('---');
    });
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
