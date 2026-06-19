import { setupDatabase } from '../lib/db/setup';

async function main() {
  console.log('Initializing database tables...');

  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not configured. Load .env.local before running this script.');
    process.exit(1);
  }

  const result = await setupDatabase();
  if (!result.success) {
    console.error('Database initialization failed:', result.error);
    process.exit(1);
  }

  console.log('Database tables are ready.');
}

main();
