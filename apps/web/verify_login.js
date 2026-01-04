const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: 'file:./dev.db',
        },
    },
});

async function main() {
    const email = 'gerencia@sotodelprior.com';
    const passwordToCheck = '123456';

    console.log(`Verifying credentials for: ${email}`);

    const user = await prisma.user.findUnique({
        where: { email },
    });

    if (!user) {
        console.error("❌ USER NOT FOUND in DB!");
        return;
    }

    console.log("User found. Hash:", user.passwordHash.substring(0, 10) + "...");

    const isValid = await bcrypt.compare(passwordToCheck, user.passwordHash);

    if (isValid) {
        console.log("✅ SUCCESS: Password '123456' matches the hash in DB.");
    } else {
        console.error("❌ FAILURE: Password '123456' DOES NOT match the hash.");
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
