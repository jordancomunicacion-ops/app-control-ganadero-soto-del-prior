const { execSync } = require('child_process');
require('dotenv').config();

console.log('Running Prisma Migration...');
try {
    // Use shell: true to support environment variable expansion if needed, though dotenv loads them into process.env
    execSync('npx prisma migrate dev --name add_restaurant_and_config', { stdio: 'inherit', shell: true });
} catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
}
