const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function exportSchema() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    console.log('\n' + '='.repeat(60));
    console.log('EXPORTING DATABASE SCHEMA');
    console.log('='.repeat(60) + '\n');
    
    const client = await pool.connect();
    
    try {
      // Get all tables in public schema
      const tablesResult = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `);
      
      console.log(`Found ${tablesResult.rows.length} tables\n`);
      
      let schemaSQL = `-- ============================================================
-- UPASS Database Schema Export
-- Generated: ${new Date().toISOString()}
-- ============================================================

BEGIN;

-- Create ENUM types
`;
      
      // Export ENUM types first
      const enumsResult = await client.query(`
        SELECT n.nspname as schema, t.typname as typename, e.enumlabel
        FROM pg_type t 
        JOIN pg_enum e ON t.oid = e.enumtypid  
        JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
        WHERE n.nspname = 'public'
        ORDER BY t.typname, e.enumsortorder
      `);
      
      const enumsByType = {};
      enumsResult.rows.forEach(row => {
        if (!enumsByType[row.typename]) {
          enumsByType[row.typename] = [];
        }
        enumsByType[row.typename].push(row.enumlabel);
      });
      
      for (const [typeName, labels] of Object.entries(enumsByType)) {
        console.log(`Processing ENUM: ${typeName}`);
        schemaSQL += `DROP TYPE IF EXISTS ${typeName} CASCADE;\n`;
        schemaSQL += `CREATE TYPE ${typeName} AS ENUM (${labels.map(l => `'${l}'`).join(', ')});\n\n`;
      }
      
      schemaSQL += `\n-- Create Tables\n`;
      
      for (const row of tablesResult.rows) {
        const tableName = row.table_name;
        console.log(`Processing: ${tableName}`);
        
        // Get CREATE TABLE statement
        const createResult = await client.query(`
          SELECT 
            'CREATE TABLE ' || table_name || ' (' || 
            string_agg(
              column_name || ' ' || 
              data_type || 
              CASE 
                WHEN character_maximum_length IS NOT NULL 
                THEN '(' || character_maximum_length || ')'
                ELSE ''
              END ||
              CASE 
                WHEN is_nullable = 'NO' THEN ' NOT NULL'
                ELSE ''
              END ||
              CASE 
                WHEN column_default IS NOT NULL THEN ' DEFAULT ' || column_default
                ELSE ''
              END,
              ', '
            ) || 
            ');' as create_statement
          FROM information_schema.columns
          WHERE table_name = $1 AND table_schema = 'public'
          GROUP BY table_name
        `, [tableName]);
        
        if (createResult.rows.length > 0) {
          schemaSQL += `\n-- Table: ${tableName}\n`;
          schemaSQL += createResult.rows[0].create_statement + '\n';
        }
        
        // Get constraints
        const constraintsResult = await client.query(`
          SELECT conname, pg_get_constraintdef(oid) as condef
          FROM pg_constraint
          WHERE conrelid = $1::regclass
        `, [tableName]);
        
        for (const constraint of constraintsResult.rows) {
          schemaSQL += `ALTER TABLE ${tableName} ADD CONSTRAINT ${constraint.conname} ${constraint.condef};\n`;
        }
      }
      
      schemaSQL += `\nCOMMIT;\n`;
      
      // Write to file
      const outputPath = path.join(__dirname, 'migrations', 'schema_export.sql');
      fs.writeFileSync(outputPath, schemaSQL);
      
      console.log(`\n✅ Schema exported to: ${outputPath}\n`);
      console.log('='.repeat(60));
      
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('\n❌ Export failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

exportSchema();
