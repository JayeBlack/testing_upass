const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function createSuperAdmin() {
  const [email, password, firstName, lastName] = process.argv.slice(2);

  if (!email || !password || !firstName || !lastName) {
    console.error('\n❌ Usage: node create_superadmin.js <email> <password> <firstName> <lastName>\n');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    const password_hash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (email, password_hash, role, first_name, last_name, is_super_admin, is_active, must_change_password, last_password_change)
       VALUES ($1, $2, 'Admin', $3, $4, TRUE, TRUE, FALSE, NOW())
       RETURNING id, email, role, first_name, last_name, is_super_admin`,
      [email, password_hash, firstName, lastName]
    );

    const user = result.rows[0];

    console.log('\n✅ Super Admin created successfully!\n');
    console.log('Account Details:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Name: ${user.first_name} ${user.last_name}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Super Admin: ${user.is_super_admin}`);
    console.log('\n');

  } catch (err) {
    if (err.code === '23505') {
      console.error('\n❌ Error: Email already exists!\n');
    } else {
      console.error('\n❌ Error:', err.message);
    }
    process.exit(1);
  } finally {
    await pool.end();
  }
}

createSuperAdmin();
