// Ultra-simple database setup - just User table
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function run() {
    try {
        console.log('[1/3] Creating User table...');

        // Create User table with all required fields
        await prisma.$executeRaw`
            CREATE TABLE IF NOT EXISTS "User" (
                "id" TEXT NOT NULL PRIMARY KEY,
                "name" TEXT NOT NULL,
                "email" TEXT NOT NULL UNIQUE,
                "password" TEXT NOT NULL,
                "role" TEXT NOT NULL DEFAULT 'USER',
                "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "resetToken" TEXT UNIQUE,
                "resetTokenExpiry" DATETIME
            )
        `;

        console.log('✓ Table created');

        console.log('[2/3] Hashing password...');
        const hashedPassword = await bcrypt.hash('123456', 10);
        console.log('✓ Password hashed');

        console.log('[3/3] Creating user...');
        const user = await prisma.user.create({
            data: {
                id: 'user_' + Date.now(),
                name: 'Gerencia Soto del Prior',
                email: 'gerencia@sotodelprior.com',
                password: hashedPassword,
                role: 'ADMIN'
            }
        });

        console.log('\n=== SUCCESS ===');
        console.log('Email: gerencia@sotodelprior.com');
        console.log('Password: 123456');
        console.log('================\n');

    } catch (error) {
        console.error('\nERROR:', error.message);
        if (error.code) console.error('Code:', error.code);
    } finally {
        await prisma.$disconnect();
    }
}

run();
