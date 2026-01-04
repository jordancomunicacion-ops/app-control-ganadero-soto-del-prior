const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

// Force datasource url if env is missing to prevent crash
const prisma = new PrismaClient({
    datasources: {
        db: {
            url: process.env.DATABASE_URL || "file:./dev.db"
        }
    }
});

async function main() {
    const email = 'gerencia@sotodelprior.com';
    const password = '123456'; // 6 chars, meets requirements

    console.log(`Updating password for user: ${email}...`);

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.update({
        where: { email },
        data: { passwordHash: hashedPassword }
    });

    console.log('Password updated successfully to 123456');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
