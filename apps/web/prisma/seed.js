
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const prisma = new PrismaClient();

async function main() {
    const email = (process.env.SEED_ADMIN_EMAIL || 'gerencia@sotodelprior.com').toLowerCase();

    // In production we refuse to use a hard-coded password. Either provide
    // SEED_ADMIN_PASSWORD or let the script generate a strong random one and
    // print it (one-time, to the operator running the seed).
    let password = process.env.SEED_ADMIN_PASSWORD;
    let generated = false;
    if (!password) {
        if (process.env.NODE_ENV === 'production') {
            password = crypto.randomBytes(16).toString('base64url');
            generated = true;
        } else {
            password = 'changeme-123456';
            generated = true;
        }
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.upsert({
        where: { email },
        update: {
            role: 'ADMIN',
            approved: true,
        },
        create: {
            email,
            name: 'Gerencia',
            password: passwordHash,
            role: 'ADMIN',
            approved: true,
        },
        select: { id: true, email: true, role: true, approved: true },
    });

    console.log('Admin user ready:', user);
    if (generated) {
        console.log('==================================================');
        console.log('Initial admin password (store securely, will not be shown again):');
        console.log(password);
        console.log('==================================================');
    }
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
