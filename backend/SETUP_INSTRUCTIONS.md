# UPASS Backend

## Initial Setup

After cloning the repository, follow these steps:

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env` and update with your database credentials:
```bash
cp .env.example .env
```

### 3. Run Database Migrations
This ensures all required departments are in the database:
```bash
node run_migrations.js
```

### 4. Create Super Admin (First Time Only)
Create the initial super admin account:
```bash
node create_superadmin.js <email> <password> <first_name> <last_name>
```

Example:
```bash
node create_superadmin.js admin@umat.edu.gh SecurePass123 John Mensah
```

### 5. Start the Server
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

## Database Verification Scripts

These scripts help verify your database setup:

- `check_db.js` - Complete database health check (tables, users, students, fees, etc.)
- `verify_departments.js` - Verify all staff users have departments assigned

Run them with:
```bash
node check_db.js
node verify_departments.js
```

## Important Notes

### Default Passwords
- **Students**: Index number (e.g., PG1234567)
- **Staff**: Email prefix before @ (e.g., john for john@umat.edu.gh)

All users must change password on first login.

### Departments in System
The system includes these 10 departments:
1. Computer Science
2. Electrical Engineering
3. Environmental and Safety Engineering
4. Finance Office
5. Geomatic Engineering
6. Mathematical Sciences
7. Mechanical Engineering
8. Mining Engineering
9. Petroleum Engineering
10. School of Postgraduate Studies

### Super Admin Capabilities
- Create and manage all system users
- Reset any user's password
- Access all departments' data
- Assign department access to staff

## Troubleshooting

If departments are missing in dropdown, run:
```bash
node run_migrations.js
```

If you need to verify database integrity:
```bash
node check_db.js
```
