const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const users = await prisma.$queryRaw`PRAGMA table_info("User")`;
        console.log('User table info:');
        console.table(users);

        const firstUser = await prisma.user.findFirst();
        console.log('First user (raw data):', firstUser);
    } catch (e) {
        console.error('Error inspecting DB:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
