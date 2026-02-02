
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany({
        where: {
            email: {
                in: ['gerencia@sotodelprior.com', 'jordan.comunicacion@gmail.com']
            }
        },
        select: {
            id: true,
            email: true,
            approved: true,
            role: true,
            password: true
        }
    });
    console.log('--- USER AUDIT ---');
    users.forEach(u => {
        console.log(`ID: ${u.id}`);
        console.log(`Email (raw): "${u.email}"`);
        console.log(`Approved: ${u.approved}`);
        console.log(`Role: ${u.role}`);
        console.log(`Password Hash starts with: ${u.password?.substring(0, 10)}...`);
        console.log('-----------------');
    });
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
