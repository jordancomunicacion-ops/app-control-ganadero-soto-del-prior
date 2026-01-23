const { PrismaClient } = require('@prisma/client');

async function test() {
    const prisma = new PrismaClient({ log: ['error', 'warn'] });

    try {
        console.log('Testing database connection...');
        const count = await prisma.user.count();
        console.log('✓ Users in database:', count);

        const user = await prisma.user.findUnique({
            where: { email: 'gerencia@sotodelprior.com' }
        });

        if (user) {
            console.log('✓ User found:', user.email, '/', user.name);
            console.log('  Password hash length:', user.password.length);
            console.log('  Role:', user.role);
        } else {
            console.log('✗ User NOT found!');
        }

    } catch (error) {
        console.error('✗ Database error:', error.message);
        console.error('  Code:', error.code);
    } finally {
        await prisma.$disconnect();
    }
}

test();
