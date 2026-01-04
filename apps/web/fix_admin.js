const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

async function updateDB(dbPath) {
    console.log(`\n--- Working on: ${dbPath} ---`);
    const prisma = new PrismaClient({
        datasources: {
            db: {
                url: `file:${dbPath}`,
            },
        },
    });

    try {
        const email = 'gerencia@sotodelprior.com';
        const password = '123456';
        const hashedPassword = await bcrypt.hash(password, 10);

        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            console.log(`User found in ${dbPath}. Updating password to 123456...`);
            await prisma.user.update({
                where: { email },
                data: { passwordHash: hashedPassword }
            });
            console.log('Password updated.');
        } else {
            console.log(`User NOT found in ${dbPath}. Creating with password 123456...`);
            await prisma.user.create({
                data: {
                    email,
                    name: 'Gerencia',
                    passwordHash: hashedPassword,
                    role: 'ADMIN',
                },
            });
            console.log('User created successfully.');
        }
    } catch (err) {
        console.error(`Error with ${dbPath}:`, err.message);
    } finally {
        await prisma.$disconnect();
    }
}

async function main() {
    await updateDB('./dev.db');
    await updateDB('./prisma/dev.db');
}

main().catch(console.error);
