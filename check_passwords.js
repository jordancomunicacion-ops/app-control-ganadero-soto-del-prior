
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany({
        select: {
            id: true,
            email: true,
            password: true,
            approved: true,
        }
    });
    users.forEach(u => {
        console.log(`User: ${u.email}, HasPassword: ${!!u.password}, Approved: ${u.approved}`);
    });
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
