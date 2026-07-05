const { Pool } = require('pg');
require('dotenv').config();

async function clearRecords() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    console.log('🗑️  Deleting all records from tables...\n');
    
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Get all table names
      const result = await client.query(`
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
        ORDER BY tablename
      `);
      
      console.log(`Found ${result.rows.length} tables\n`);
      
      // Disable foreign key checks temporarily
      await client.query('SET CONSTRAINTS ALL DEFERRED');
      
      // Truncate all tables
      for (const row of result.rows) {
        const tableName = row.tablename;
        console.log(`  Clearing ${tableName}...`);
        await client.query(`TRUNCATE TABLE "${tableName}" RESTART IDENTITY CASCADE`);
      }
      
      await client.query('COMMIT');
      
      console.log('\n✅ All records deleted successfully!\n');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

clearRecords();
