const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Ghanaian names pool
const firstNames = [
  'Kwame', 'Kofi', 'Yaw', 'Kwabena', 'Kwaku', 'Yaa', 'Akosua', 'Adwoa', 'Abena', 'Akua',
  'Kojo', 'Kwesi', 'Adjoa', 'Ama', 'Efua', 'Afi', 'Kobina', 'Ekua', 'Esi', 'Afia',
  'Kwadwo', 'Ebo', 'Ato', 'Mensah', 'Kodwo', 'Araba', 'Panyin', 'Kakra', 'Mansa', 'Serwa'
];

const lastNames = [
  'Mensah', 'Asante', 'Appiah', 'Osei', 'Owusu', 'Boateng', 'Agyemang', 'Frimpong', 'Sarpong', 'Darko',
  'Annan', 'Nkrumah', 'Acheampong', 'Ofori', 'Ansah', 'Addo', 'Boakye', 'Opoku', 'Gyasi', 'Danquah',
  'Mensah', 'Afriyie', 'Amoah', 'Yeboah', 'Amankwah', 'Adjei', 'Agyei', 'Akuffo', 'Wiredu', 'Quaye'
];

// Departments and their programs
const departments = {
  'Computer Science and Engineering': [
    'Computer Science and Engineering MSc',
    'Computer Science and Engineering MPhil',
  ],
  'Electrical and Electronic Engineering': [
    'Electrical and Electronic Engineering MSc',
    'Electrical and Electronic Engineering MPhil',
  ],
  'Mining Engineering': [
    'Mining Engineering MSc',
    'Mining Engineering MPhil',
  ],
  'Geomatic Engineering': [
    'Geomatic Engineering MSc',
    'Geomatic Engineering MPhil',
  ],
  'Mechanical Engineering': [
    'Mechanical Engineering MSc',
    'Mechanical Engineering MPhil',
  ],
  'Petroleum Engineering': [
    'Petroleum Engineering MSc',
    'Petroleum Engineering MPhil',
  ],
  'Geological Engineering': [
    'Geological Engineering MSc',
    'Geological Engineering MPhil',
  ],
  'Minerals Engineering': [
    'Minerals Engineering MSc',
    'Minerals Engineering MPhil',
  ],
  'Mathematics Sciences': [
    'Mathematical Sciences MSc',
    'Mathematical Sciences MPhil',
  ],
  'Management Studies': [
    'Management Studies MSc',
    'Management Studies MBA',
  ],
  'Environmental and Safety Engineering': [
    'Environmental and Safety Engineering MSc',
    'Environmental and Safety Engineering MPhil',
  ],
};

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateStudents(count) {
  const students = [];
  const usedIndexes = new Set();
  const usedEmails = new Set();
  
  const deptNames = Object.keys(departments);
  
  // Distribution: 25% admitted 2022, 75% admitted 2024
  const admission2022Count = Math.floor(count * 0.25);
  const admission2024Count = count - admission2022Count;
  
  let indexCounter = 1;

  // Generate 2022 cohort (graduating 2024/2025)
  for (let i = 0; i < admission2022Count; i++) {
    const firstName = randomChoice(firstNames);
    const lastName = randomChoice(lastNames);
    const indexNumber = `UMaT/PG/${String(indexCounter).padStart(4, '0')}/22`;
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${indexCounter}@umat.edu.gh`;
    const dept = randomChoice(deptNames);
    const program = randomChoice(departments[dept]);
    const cohort = Math.random() > 0.5 ? 'January' : 'July';
    const academicYear = '2024/2025'; // 2022 + 2 years = 2024 graduation
    
    if (!usedIndexes.has(indexNumber) && !usedEmails.has(email)) {
      students.push({
        name: `${firstName} ${lastName}`,
        indexNumber,
        email,
        program,
        department: dept,
        cohort,
        academicYear
      });
      usedIndexes.add(indexNumber);
      usedEmails.add(email);
      indexCounter++;
    }
  }

  // Generate 2024 cohort (graduating 2026/2027)
  for (let i = 0; i < admission2024Count; i++) {
    const firstName = randomChoice(firstNames);
    const lastName = randomChoice(lastNames);
    const indexNumber = `UMaT/PG/${String(indexCounter).padStart(4, '0')}/24`;
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${indexCounter}@umat.edu.gh`;
    const dept = randomChoice(deptNames);
    const program = randomChoice(departments[dept]);
    const cohort = Math.random() > 0.5 ? 'January' : 'July';
    const academicYear = '2026/2027'; // 2024 + 2 years = 2026 graduation
    
    if (!usedIndexes.has(indexNumber) && !usedEmails.has(email)) {
      students.push({
        name: `${firstName} ${lastName}`,
        indexNumber,
        email,
        program,
        department: dept,
        cohort,
        academicYear
      });
      usedIndexes.add(indexNumber);
      usedEmails.add(email);
      indexCounter++;
    }
  }

  return students;
}

function createExcelFile() {
  console.log('\n📊 Generating Bulk Students Sample File...\n');
  
  const students = generateStudents(300);
  
  // Create worksheet data
  const wsData = [
    ['Name', 'Index Number', 'Email', 'Programme', 'Department', 'Cohort', 'Academic Year'],
    ...students.map(s => [
      s.name,
      s.indexNumber,
      s.email,
      s.program,
      s.department,
      s.cohort,
      s.academicYear
    ])
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Set column widths
  ws['!cols'] = [
    { wch: 20 },  // Name
    { wch: 18 },  // Index Number
    { wch: 35 },  // Email
    { wch: 45 },  // Programme
    { wch: 40 },  // Department
    { wch: 12 },  // Cohort
    { wch: 15 },  // Academic Year
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Students');

  const outputDir = path.join(__dirname, '..', 'excel-files');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, 'sample_bulk_students.xlsx');
  XLSX.writeFile(wb, outputPath);

  console.log(`✅ Generated ${students.length} students`);
  console.log(`📁 File saved to: ${outputPath}`);
  
  // Statistics
  const cohort2022 = students.filter(s => s.indexNumber.includes('/22')).length;
  const cohort2024 = students.filter(s => s.indexNumber.includes('/24')).length;
  const januaryCohort = students.filter(s => s.cohort === 'January').length;
  const julyCohort = students.filter(s => s.cohort === 'July').length;
  
  console.log('\n📈 Statistics:');
  console.log(`   • 2022 Admission (Graduating 2024/2025): ${cohort2022} students`);
  console.log(`   • 2024 Admission (Graduating 2026/2027): ${cohort2024} students`);
  console.log(`   • January Intake: ${januaryCohort} students`);
  console.log(`   • July Intake: ${julyCohort} students`);
  
  console.log('\n📋 Sample Records:');
  students.slice(0, 5).forEach((s, idx) => {
    console.log(`   ${idx + 1}. ${s.name} | ${s.indexNumber} | ${s.department} | ${s.academicYear}`);
  });
  
  console.log('\n✨ Done!\n');
}

createExcelFile();
