const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function importSchema() {
  const schemaFile = path.join(__dirname, 'migrations', 'schema_export.sql');

  if (!fs.existsSync(schemaFile)) {
    console.error('\n❌ Schema file not found:', schemaFile);
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });

  try {
    console.log('\n' + '='.repeat(60));
    console.log('IMPORTING DATABASE SCHEMA');
    console.log('='.repeat(60) + '\n');

    console.log(`📄 Reading schema from: ${path.basename(schemaFile)}`);
    let schemaSql = fs.readFileSync(schemaFile, 'utf-8');

    // Replace nextval(...) with SERIAL — sequences don't exist yet on a fresh DB
    schemaSql = schemaSql.replace(/integer NOT NULL DEFAULT nextval\('[^']+'::\s*regclass\)/g, 'SERIAL');

    // Fix USER-DEFINED columns (pg exports enum columns as USER-DEFINED)
    schemaSql = schemaSql.replace(/actor_role USER-DEFINED/g, 'actor_role character varying(50)');
    schemaSql = schemaSql.replace(/role USER-DEFINED NOT NULL/g, 'role user_role NOT NULL');

    const client = await pool.connect();

    try {
      console.log('🔄 Step 1: Creating ENUM types...\n');
      const enumMatch = schemaSql.match(/-- Create ENUM types([\s\S]*?)-- Create Tables/);
      if (enumMatch) {
        for (const stmt of enumMatch[1].trim().split(';').filter(s => s.trim())) {
          await client.query(stmt);
        }
      }

      console.log('🔄 Step 2: Creating tables...\n');
      const tableMatches = [...schemaSql.matchAll(/CREATE TABLE (\w+) \([^;]+\);/gs)];
      for (const match of tableMatches) {
        await client.query(match[0]);
      }
      console.log(`   ✓ Created ${tableMatches.length} tables\n`);

      console.log('🔄 Step 3: Adding primary keys...\n');
      for (const match of schemaSql.matchAll(/ALTER TABLE (\w+) ADD CONSTRAINT (\w+_pkey) PRIMARY KEY[^;]+;/g)) {
        try { await client.query(match[0]); } catch (e) { if (!e.message.includes('already exists')) console.log(`   ⚠ ${e.message.split('\n')[0]}`); }
      }

      console.log('🔄 Step 4: Adding unique constraints...\n');
      for (const match of schemaSql.matchAll(/ALTER TABLE (\w+) ADD CONSTRAINT (\w+(?:_key|_unique)) UNIQUE[^;]+;/g)) {
        try { await client.query(match[0]); } catch (e) { if (!e.message.includes('already exists')) console.log(`   ⚠ ${e.message.split('\n')[0]}`); }
      }

      console.log('🔄 Step 5: Adding foreign keys...\n');
      for (const match of schemaSql.matchAll(/ALTER TABLE (\w+) ADD CONSTRAINT (\w+_fkey) FOREIGN KEY[^;]+;/g)) {
        try { await client.query(match[0]); } catch (e) { if (!e.message.includes('already exists')) console.log(`   ⚠ ${e.message.split('\n')[0]}`); }
      }

      console.log('\n✅ Schema import completed!\n');

      const tablesResult = await client.query(
        `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name`
      );
      console.log(`📋 Total tables in database: ${tablesResult.rows.length}\n`);
      tablesResult.rows.forEach(row => console.log(`   ✓ ${row.table_name}`));

      console.log('\n' + '='.repeat(60));
      console.log('NEXT STEPS:');
      console.log('='.repeat(60));
      console.log('  node backend/run_migrations.js');
      console.log('  node backend/populate_programs.js');
      console.log('  node backend/populate_courses.js');
      console.log('  create-admin.bat');
      console.log('='.repeat(60) + '\n');

    } finally {
      client.release();
    }
  } catch (err) {
    console.error('\n❌ Import failed:', err.message);
    console.error('\n💡 TIP: Check your DATABASE_URL in .env file\n');
    process.exit(1);
  } finally {
    await pool.end();
  }
}

importSchema();
