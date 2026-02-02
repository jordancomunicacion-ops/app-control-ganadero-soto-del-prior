
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    const email = 'gerencia@sotodelprior.com';
    const password = '123456';
    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.upsert({
        where: { email },
        update: {
            password: passwordHash,
            approved: true,
            role: 'ADMIN'
        },
        create: {
            email,
            name: 'Gerencia',
            password: passwordHash,
            role: 'ADMIN',
            approved: true,
        },
    });

    console.log('User gerencia updated successfully with password 123456');
    console.log({ id: user.id, email: user.email, approved: user.approved, role: user.role });
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
