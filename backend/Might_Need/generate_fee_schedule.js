const XLSX = require('xlsx');
const path = require('path');

// Fee schedule data
const feeSchedule = [
  // MSc Programs
  { Programme: 'Computer Science and Engineering MSc', Level: 'MSc', Amount: 15000 },
  { Programme: 'Electrical and Electronic Engineering MSc', Level: 'MSc', Amount: 15000 },
  { Programme: 'Mechanical Engineering MSc', Level: 'MSc', Amount: 15000 },
  { Programme: 'Geomatic Engineering MSc', Level: 'MSc', Amount: 15000 },
  { Programme: 'Geological Engineering MSc', Level: 'MSc', Amount: 15000 },
  { Programme: 'Mining Engineering MSc', Level: 'MSc', Amount: 15000 },
  { Programme: 'Minerals Engineering MSc', Level: 'MSc', Amount: 15000 },
  { Programme: 'Petroleum Engineering MSc', Level: 'MSc', Amount: 15000 },
  { Programme: 'Mathematical Sciences MSc', Level: 'MSc', Amount: 15000 },
  { Programme: 'Occupational Health and Safety MSc', Level: 'MSc', Amount: 15000 },
  { Programme: 'Engineering Management MSc', Level: 'MSc', Amount: 15000 },
  
  // MPhil Programs
  { Programme: 'Computer Science and Engineering MPhil', Level: 'MPhil', Amount: 18000 },
  { Programme: 'Electrical and Electronic Engineering MPhil', Level: 'MPhil', Amount: 18000 },
  { Programme: 'Mechanical Engineering MPhil', Level: 'MPhil', Amount: 18000 },
  { Programme: 'Geomatic Engineering MPhil', Level: 'MPhil', Amount: 18000 },
  { Programme: 'Geological Engineering MPhil', Level: 'MPhil', Amount: 18000 },
  { Programme: 'Mining Engineering MPhil', Level: 'MPhil', Amount: 18000 },
  { Programme: 'Minerals Engineering MPhil', Level: 'MPhil', Amount: 18000 },
  { Programme: 'Petroleum Engineering MPhil', Level: 'MPhil', Amount: 18000 },
  { Programme: 'Mathematical Sciences MPhil', Level: 'MPhil', Amount: 18000 },
  { Programme: 'Occupational Health and Safety MPhil', Level: 'MPhil', Amount: 18000 },
  
  // PhD Programs
  { Programme: 'Electrical and Electronic Engineering PhD', Level: 'PhD', Amount: 25000 },
  { Programme: 'Mechanical Engineering PhD', Level: 'PhD', Amount: 25000 },
  { Programme: 'Geomatic Engineering PhD', Level: 'PhD', Amount: 25000 },
  { Programme: 'Petroleum Engineering PhD', Level: 'PhD', Amount: 25000 },
  { Programme: 'Mathematics PhD', Level: 'PhD', Amount: 25000 },
  { Programme: 'Occupational Health and Safety PhD', Level: 'PhD', Amount: 25000 },
  
  // MBA Programs
  { Programme: 'Master of Business and Technology Management - Supply Chain Management', Level: 'MBA', Amount: 20000 },
  { Programme: 'Master of Business and Technology Management - Finance and Investment', Level: 'MBA', Amount: 20000 },
  { Programme: 'Master of Business and Technology Management - Management Information Systems', Level: 'MBA', Amount: 20000 },
  { Programme: 'Master of Business and Technology Management - Strategic Human Resource Management', Level: 'MBA', Amount: 20000 },
  
  // Postgraduate Diploma
  { Programme: 'Postgraduate Diploma in Mining Engineering', Level: 'PgD', Amount: 12000 }
];

// Create workbook
const ws = XLSX.utils.json_to_sheet(feeSchedule);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Fee Schedule');

// Save file
const outputPath = path.join(__dirname, 'excel-files', 'sample_fee_schedule.xlsx');
XLSX.writeFile(wb, outputPath);

console.log(`✅ Generated fee schedule`);
console.log(`📁 Saved to: ${outputPath}`);
console.log(`\n   Total Programs: ${feeSchedule.length}`);
console.log('\nFee Structure:');
console.log('   MSc: GHS 15,000');
console.log('   MPhil: GHS 18,000');
console.log('   PhD: GHS 25,000');
console.log('   MBA: GHS 20,000');
console.log('   PgD: GHS 12,000');
