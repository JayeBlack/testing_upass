const XLSX = require('xlsx');
const path = require('path');
const { marksToGrade, generateRealisticMark } = require('./grading_utils');

// Read the students file
const studentsPath = path.join(__dirname, '..', 'excel-files', 'sample_bulk_students.xlsx');
const studentsWb = XLSX.readFile(studentsPath);
const studentsWs = studentsWb.Sheets[studentsWb.SheetNames[0]];
const students = XLSX.utils.sheet_to_json(studentsWs);

// Filter Computer Science and Engineering students
const csStudents = students.filter(s => 
  s.Department === 'Computer Science and Engineering' || 
  s.Department === 'Computer Science' ||
  s.Department === 'CSE'
);

// Computer Science courses (Semester 2) - CORRECT CODES FROM FRONTEND CATALOG
const sem2Courses = [
  { code: 'CE 579', name: 'Data Mining', credits: 3 },
  { code: 'CE 589', name: 'Information Theory and Coding', credits: 3 },
  { code: 'CE 572', name: 'Multi-Agent Systems', credits: 3 },
  { code: 'CE 574', name: 'Computer Vision and Pattern Recognition', credits: 3 }
];

// Generate results
const results = [];
csStudents.forEach(student => {
  sem2Courses.forEach(course => {
    const marks = generateRealisticMark();
    const grade = marksToGrade(marks);
    
    results.push({
      'Index Number': student['Index Number'],
      'Student Name': student.Name,
      'Course Name': course.name,
      'Credit Hours': course.credits,
      'Marks': marks
    });
  });
});

// Create workbook
const ws = XLSX.utils.json_to_sheet(results);

// Set column widths
ws['!cols'] = [
  { wch: 20 }, // Index Number
  { wch: 30 }, // Student Name
  { wch: 45 }, // Course Name
  { wch: 12 }, // Credit Hours
  { wch: 8 }   // Marks
];

const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Results');

// Save file
const outputPath = path.join(__dirname, '..', 'excel-files', 'results_computer_science_sem2.xlsx');
XLSX.writeFile(wb, outputPath);

console.log('✅ Generated Semester 2 results for Computer Science and Engineering');
console.log(`📁 Saved to: ${outputPath}`);
console.log(`\n   Students: ${csStudents.length}`);
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
