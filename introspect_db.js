
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const columns = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'User'
    `;
        console.log('--- USER TABLE COLUMNS ---');
        console.log(JSON.stringify(columns, null, 2));
        console.log('--------------------------');
    } catch (e) {
        console.error('Error introspecting User table:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
