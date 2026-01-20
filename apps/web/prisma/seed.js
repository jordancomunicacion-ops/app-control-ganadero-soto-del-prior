
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    const email = 'gerencia@sotodelprior.com';
    const password = '123456';
    const passwordHash = await bcrypt.hash(password, 10);

    // Delete existing user to ensure clean state
    try {
        await prisma.user.delete({ where: { email } });
        console.log(`Deleted existing user: ${email}`);
    } catch (e) {
        // Ignore if not found
        console.log(`User ${email} did not exist, creating new.`);
    }

    const user = await prisma.user.create({
        data: {
            email,
            name: 'Gerencia',
            password: passwordHash,
            role: 'ADMIN',
        },
    });

    console.log({ user });
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
