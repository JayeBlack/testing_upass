const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function clearSchema() {
  // Check if DATABASE_URL is loaded
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not found in .env file');
    console.error('   Make sure backend/.env exists and contains DATABASE_URL');
    process.exit(1);
  }
  
  // Explicitly parse DATABASE_URL to ensure password is treated as string
  const dbUrl = new URL(process.env.DATABASE_URL);
  const pool = new Pool({
    host: dbUrl.hostname,
    port: parseInt(dbUrl.port) || 5432,
    database: dbUrl.pathname.slice(1),
    user: dbUrl.username,
    password: dbUrl.password,  // This ensures password is always a string
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });
  
  try {
    console.log('🗑️  Dropping entire public schema...\n');
    
    await pool.query('DROP SCHEMA public CASCADE');
    await pool.query('CREATE SCHEMA public');
    await pool.query('GRANT ALL ON SCHEMA public TO postgres');
    await pool.query('GRANT ALL ON SCHEMA public TO public');
    
    console.log('✅ Schema cleared successfully!\n');
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

clearSchema();
