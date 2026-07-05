const XLSX = require('xlsx');
const path = require('path');

// Better distribution: 8 Supervisors, 3 Admins, 2 Registrars, 2 Exams Officers, 2 Accountants, 2 Accounting Assistants, 2 Deans, 2 ViceDeans, 2 Admin Assistants
const users = [
  // Supervisors (8)
  { name: 'Dr. John Mensah', email: 'john.mensah@umat.edu.gh', role: 'Supervisor', department: 'Computer Science', phone: '0244123456' },
  { name: 'Prof. Grace Asante', email: 'grace.asante@umat.edu.gh', role: 'Supervisor', department: 'Electrical Engineering', phone: '0244123457' },
  { name: 'Dr. Kwame Boateng', email: 'kwame.boateng@umat.edu.gh', role: 'Supervisor', department: 'Mining Engineering', phone: '0244123458' },
  { name: 'Prof. Ama Opoku', email: 'ama.opoku@umat.edu.gh', role: 'Supervisor', department: 'Petroleum Engineering', phone: '0244123459' },
  { name: 'Dr. Kofi Danso', email: 'kofi.danso@umat.edu.gh', role: 'Supervisor', department: 'Mechanical Engineering', phone: '0244123460' },
  { name: 'Dr. Akosua Owusu', email: 'akosua.owusu@umat.edu.gh', role: 'Supervisor', department: 'Environmental and Safety Engineering', phone: '0244123461' },
  { name: 'Prof. Yaw Appiah', email: 'yaw.appiah@umat.edu.gh', role: 'Supervisor', department: 'Geomatic Engineering', phone: '0244123462' },
  { name: 'Dr. Abena Agyei', email: 'abena.agyei@umat.edu.gh', role: 'Supervisor', department: 'Mathematical Sciences', phone: '0244123463' },
  
  // Admins (3)
  { name: 'Kwesi Adjei', email: 'kwesi.adjei@umat.edu.gh', role: 'Admin', department: 'School of Postgraduate Studies', phone: '0244123464' },
  { name: 'Samuel Osei', email: 'samuel.osei@umat.edu.gh', role: 'Admin', department: 'School of Postgraduate Studies', phone: '0244123480' },
  { name: 'Rebecca Asare', email: 'rebecca.asare@umat.edu.gh', role: 'Admin', department: 'School of Postgraduate Studies', phone: '0244123481' },
  
  // Registrars (2)
  { name: 'Efua Mensah', email: 'efua.mensah@umat.edu.gh', role: 'Registrar', department: 'School of Postgraduate Studies', phone: '0244123465' },
  { name: 'Joseph Ansah', email: 'joseph.ansah@umat.edu.gh', role: 'Registrar', department: 'School of Postgraduate Studies', phone: '0244123482' },
  
  // Exams Officers (2)
  { name: 'Peter Bonsu', email: 'peter.bonsu@umat.edu.gh', role: 'ExamsOfficer', department: 'School of Postgraduate Studies', phone: '0244123466' },
  { name: 'Victoria Amoah', email: 'victoria.amoah@umat.edu.gh', role: 'ExamsOfficer', department: 'School of Postgraduate Studies', phone: '0244123483' },
  
  // Accountants (2)
  { name: 'Adwoa Kwarteng', email: 'adwoa.kwarteng@umat.edu.gh', role: 'Accountant', department: 'Finance Office', phone: '0244123467' },
  { name: 'Emmanuel Boakye', email: 'emmanuel.boakye@umat.edu.gh', role: 'Accountant', department: 'Finance Office', phone: '0244123478' },
  
  // Accounting Assistants (2) - THE MISSING ROLE!
  { name: 'Daniel Frimpong', email: 'daniel.frimpong@umat.edu.gh', role: 'AccountingAssistant', department: 'Finance Office', phone: '0244123484' },
  { name: 'Martha Antwi', email: 'martha.antwi@umat.edu.gh', role: 'AccountingAssistant', department: 'Finance Office', phone: '0244123471' },
  
  // Deans (2)
  { name: 'Prof. Kojo Nkrumah', email: 'kojo.nkrumah@umat.edu.gh', role: 'Dean', department: 'Computer Science', phone: '0244123468' },
  { name: 'Prof. George Ankrah', email: 'george.ankrah@umat.edu.gh', role: 'Dean', department: 'Mining Engineering', phone: '0244123485' },
  
  // ViceDeans (2)
  { name: 'Dr. Akua Sarpong', email: 'akua.sarpong@umat.edu.gh', role: 'ViceDean', department: 'Electrical Engineering', phone: '0244123469' },
  { name: 'Dr. Patience Adu', email: 'patience.adu@umat.edu.gh', role: 'ViceDean', department: 'Petroleum Engineering', phone: '0244123486' },
  
  // Admin Assistants (2)
  { name: 'Francis Ofosu', email: 'francis.ofosu@umat.edu.gh', role: 'AdminAssistant', department: 'School of Postgraduate Studies', phone: '0244123470' },
  { name: 'Beatrice Adom', email: 'beatrice.adom@umat.edu.gh', role: 'AdminAssistant', department: 'School of Postgraduate Studies', phone: '0244123479' }
];

const worksheet = XLSX.utils.json_to_sheet(users);

// Set column widths for better readability
worksheet['!cols'] = [
  { wch: 25 }, // name
  { wch: 35 }, // email
  { wch: 18 }, // role
  { wch: 40 }, // department
  { wch: 15 }  // phone
];

const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, worksheet, 'Users');

const outputPath = path.join(__dirname, '..', 'excel-files', 'sample_bulk_users.xlsx');
XLSX.writeFile(workbook, outputPath);

// Count by role
const roleCounts = {};
users.forEach(u => {
  roleCounts[u.role] = (roleCounts[u.role] || 0) + 1;
});

console.log(`✅ Created sample bulk users file: ${outputPath}`);
console.log(`\n   Total users: ${users.length}`);
console.log('\n   Distribution by role:');
Object.entries(roleCounts).sort((a, b) => b[1] - a[1]).forEach(([role, count]) => {
  console.log(`   - ${role}: ${count}`);
});
console.log('\n   Departments covered:');
const depts = [...new Set(users.map(u => u.department))];
depts.forEach(d => console.log(`   - ${d}`));
