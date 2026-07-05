const XLSX = require('xlsx');
const path = require('path');
const { marksToGrade, generateRealisticMark } = require('./grading_utils');

// Read the students file
const studentsPath = path.join(__dirname, '..', 'excel-files', 'sample_bulk_students.xlsx');
const studentsWb = XLSX.readFile(studentsPath);
const studentsWs = studentsWb.Sheets[studentsWb.SheetNames[0]];
const students = XLSX.utils.sheet_to_json(studentsWs);

// Filter Electrical and Electronic Engineering students
const eeeStudents = students.filter(s => 
  s.Department === 'Electrical and Electronic Engineering' || 
  s.Department === 'Electrical Engineering' ||
  s.Department === 'EEE'
);

// Electrical Engineering courses (Semester 2) - CORRECT CODES FROM FRONTEND CATALOG
const sem2Courses = [
  { code: 'EL 575', name: 'Power System Planning, Protection and Operations', credits: 3 },
  { code: 'EL 579', name: 'Computer Control Systems', credits: 3 },
  { code: 'EL 586', name: 'Mobile Communication Systems', credits: 3 },
  { code: 'EL 592', name: 'Green Energy and Smart Grid Systems', credits: 3 }
];

// Generate results
const results = [];
eeeStudents.forEach(student => {
  sem2Courses.forEach(course => {
    const marks = generateRealisticMark();
    const grade = marksToGrade(marks);
    
    results.push({
      'Index Number': student['Index Number'],
      'Student Name': student.Name,
      'Course Code': course.code,
      'Course Name': course.name,
      'Credit Hours': course.credits,
      'Marks': marks,
      'Grade': grade
    });
  });
});

// Create workbook
const ws = XLSX.utils.json_to_sheet(results);

// Set column widths
ws['!cols'] = [
  { wch: 20 }, // Index Number
  { wch: 30 }, // Student Name
  { wch: 12 }, // Course Code
  { wch: 45 }, // Course Name
  { wch: 12 }, // Credit Hours
  { wch: 8 },  // Marks
  { wch: 8 }   // Grade
];

const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Results');

// Save file
const outputPath = path.join(__dirname, '..', 'excel-files', 'results_electrical_engineering_sem2.xlsx');
XLSX.writeFile(wb, outputPath);

console.log('✅ Generated Semester 2 results for Electrical and Electronic Engineering');
console.log(`📁 Saved to: ${outputPath}`);
console.log(`\n   Students: ${eeeStudents.length}`);
console.log(`   Courses: ${sem2Courses.length}`);
console.log(`   Total Records: ${results.length}`);

// Calculate grade distribution
const gradeCount = results.reduce((acc, r) => {
  acc[r.Grade] = (acc[r.Grade] || 0) + 1;
  return acc;
}, {});

console.log(`\n   Grade Distribution:`);
console.log(`     A: ${gradeCount['A'] || 0} (${Math.round((gradeCount['A'] || 0) / results.length * 100)}%)`);
console.log(`     B: ${gradeCount['B'] || 0} (${Math.round((gradeCount['B'] || 0) / results.length * 100)}%)`);
console.log(`     C: ${gradeCount['C'] || 0} (${Math.round((gradeCount['C'] || 0) / results.length * 100)}%)`);
console.log(`     D: ${gradeCount['D'] || 0} (${Math.round((gradeCount['D'] || 0) / results.length * 100)}%)`);
console.log(`     F: ${gradeCount['F'] || 0} (${Math.round((gradeCount['F'] || 0) / results.length * 100)}%)\n`);
