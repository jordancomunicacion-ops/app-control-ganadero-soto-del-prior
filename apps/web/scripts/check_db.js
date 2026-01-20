
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("=== CHECKING DATABASE USERS ===");
    try {
        const users = await prisma.user.findMany();
        console.log(`Found ${users.length} users.`);
        users.forEach(u => {
            console.log(`- User: ${u.email} | Role: ${u.role} | Password (hash prefix): ${u.password ? u.password.substring(0, 10) + '...' : 'NULL'}`);
        });
    } catch (e) {
        console.error("FAILED TO QUERY USERS:", e);
    }
    console.log("===============================");
}

main()
    .finally(() => prisma.$disconnect());
