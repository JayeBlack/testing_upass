const XLSX = require('xlsx');
const { Pool } = require('pg');
require('dotenv').config();

async function diagnoseUploadIssues() {
  console.log('\n🔍 DIAGNOSING BULK UPLOAD ISSUES\n');
  console.log('='.repeat(60));

  // Read Excel file
  const wb = XLSX.readFile('./excel-files/sample_bulk_students.xlsx');
  const ws = wb.Sheets[wb.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

  console.log('\n📊 Excel File Analysis:');
  console.log(`   Total rows: ${data.length} (including header)`);
  console.log(`   Data rows: ${data.length - 1}`);

  // Extract emails and index numbers
  const emails = [];
  const indexes = [];
  const rows = data.slice(1); // Skip header

  rows.forEach((row, idx) => {
    if (row[2]) emails.push({ row: idx + 2, email: row[2].trim().toLowerCase() });
    if (row[1]) indexes.push({ row: idx + 2, index: String(row[1]).trim() });
  });

  console.log(`   Emails found: ${emails.length}`);
  console.log(`   Indexes found: ${indexes.length}`);

  // Check for duplicates in Excel
  console.log('\n📋 Checking for duplicates in Excel file:');
  
  const emailMap = new Map();
  const emailDuplicates = [];
  emails.forEach(({ row, email }) => {
    if (emailMap.has(email)) {
      emailDuplicates.push({ row, email, firstRow: emailMap.get(email) });
    } else {
      emailMap.set(email, row);
    }
  });

  const indexMap = new Map();
  const indexDuplicates = [];
  indexes.forEach(({ row, index }) => {
    if (indexMap.has(index)) {
      indexDuplicates.push({ row, index, firstRow: indexMap.get(index) });
    } else {
      indexMap.set(index, row);
    }
  });

  if (emailDuplicates.length > 0) {
    console.log(`   ⚠️  Duplicate emails in Excel: ${emailDuplicates.length}`);
    emailDuplicates.slice(0, 5).forEach(d => {
      console.log(`      Row ${d.row}: ${d.email} (first appears at row ${d.firstRow})`);
    });
  } else {
    console.log('   ✅ No duplicate emails in Excel');
  }

  if (indexDuplicates.length > 0) {
    console.log(`   ⚠️  Duplicate indexes in Excel: ${indexDuplicates.length}`);
    indexDuplicates.slice(0, 5).forEach(d => {
      console.log(`      Row ${d.row}: ${d.index} (first appears at row ${d.firstRow})`);
    });
  } else {
    console.log('   ✅ No duplicate indexes in Excel');
  }

  // Check database
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    console.log('\n💾 Checking existing records in database:');

    // Count existing students
    const studentCount = await pool.query('SELECT COUNT(*) FROM students');
    console.log(`   Total students in DB: ${studentCount.rows[0].count}`);

    // Check for email conflicts
    const emailList = emails.map(e => e.email);
    const existingEmails = await pool.query(
      'SELECT email FROM users WHERE email = ANY($1)',
      [emailList]
    );
    console.log(`   Existing emails that would conflict: ${existingEmails.rows.length}`);
    if (existingEmails.rows.length > 0) {
      console.log('   First 5 conflicting emails:');
      existingEmails.rows.slice(0, 5).forEach(row => {
        console.log(`      - ${row.email}`);
      });
    }

    // Check for index conflicts
    const indexList = indexes.map(i => i.index);
    const existingIndexes = await pool.query(
      'SELECT index_number FROM students WHERE index_number = ANY($1)',
      [indexList]
    );
    console.log(`   Existing indexes that would conflict: ${existingIndexes.rows.length}`);
    if (existingIndexes.rows.length > 0) {
      console.log('   First 5 conflicting indexes:');
      existingIndexes.rows.slice(0, 5).forEach(row => {
        console.log(`      - ${row.index_number}`);
      });
    }

    // Calculate potential errors
    const potentialErrors = existingEmails.rows.length + existingIndexes.rows.length;
    console.log('\n📊 Summary:');
    console.log(`   Potential errors from conflicts: ${potentialErrors}`);
    console.log(`   Expected successful uploads: ${data.length - 1 - potentialErrors}`);

    if (existingEmails.rows.length > 0 || existingIndexes.rows.length > 0) {
      console.log('\n💡 Solution:');
      console.log('   Option 1: Clear existing students first');
      console.log('   Option 2: Modify Excel file to use different emails/indexes');
      console.log('   Option 3: Clear database and reimport schema');
    }

  } catch (err) {
    console.error('\n❌ Database error:', err.message);
  } finally {
    await pool.end();
  }

  console.log('\n' + '='.repeat(60) + '\n');
}

diagnoseUploadIssues().catch(console.error);
