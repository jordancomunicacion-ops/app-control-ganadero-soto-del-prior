
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
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
    fs.writeFileSync('audit_output.json', JSON.stringify(users, null, 2));
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
