const XLSX = require('xlsx');
const path = require('path');

// Generate sample payment updates for 2 students who owe fees from bulk upload
// Uses actual student names from bulk students file
// Student 1 (UMaT/PG/0001/22 - Mensah Frimpong): Will overpay
// Student 2 (UMaT/PG/0002/22 - Kodwo Agyemang): Will pay exact remainder
function generatePaymentUpdates() {
  // First, load student names from sample_bulk_students.xlsx
  const studentsFilePath = path.join(__dirname, 'excel-files', 'sample_bulk_students.xlsx');
  const studentsWb = XLSX.readFile(studentsFilePath);
  const studentsWs = studentsWb.Sheets[studentsWb.SheetNames[0]];
  const students = XLSX.utils.sheet_to_json(studentsWs);
  
  // Also load the bulk payments to get accurate outstanding balances
  const paymentsFilePath = path.join(__dirname, 'excel-files', 'sample_bulk_payments.xlsx');
  const paymentsWb = XLSX.readFile(paymentsFilePath);
  const paymentsWs = paymentsWb.Sheets[paymentsWb.SheetNames[0]];
  const payments = XLSX.utils.sheet_to_json(paymentsWs);
  
  // Get first two students who owe fees
  const student1Payment = payments.find(p => p['Index Number'] === 'UMaT/PG/0001/22');
  const student2Payment = payments.find(p => p['Index Number'] === 'UMaT/PG/0002/22');
  
  const student1 = students.find(s => s['Index Number'] === 'UMaT/PG/0001/22');
  const student2 = students.find(s => s['Index Number'] === 'UMaT/PG/0002/22');
  
  const student1Balance = student1Payment['Outstanding Balance'];
  const student2Balance = student2Payment['Outstanding Balance'];
  
  const updates = [
    {
      'Index Number': 'UMaT/PG/0001/22',
      'Student Name': student1.Name,
      'Total Amount': student1Payment['Total Amount'], // Original total fee (not outstanding balance)
      'Amount Paid': student1Balance + 1000, // Overpayment by 1000
      'Academic Year': student1Payment['Academic Year'],
      'Semester': student1Payment['Semester'],
      'Payment Method': 'Bank Transfer',
      'Note': `Payment update: Overpays by GHS 1000 on outstanding balance of GHS ${student1Balance}`
    },
    {
      'Index Number': 'UMaT/PG/0002/22',
      'Student Name': student2.Name,
      'Total Amount': student2Payment['Total Amount'], // Original total fee (not outstanding balance)
      'Amount Paid': student2Balance, // Exact remainder
      'Academic Year': student2Payment['Academic Year'],
      'Semester': student2Payment['Semester'],
      'Payment Method': 'Bank Transfer',
      'Note': `Payment update: Pays exact outstanding balance of GHS ${student2Balance}`
    }
  ];
  
  // Create workbook
  const ws = XLSX.utils.json_to_sheet(updates);
  
  // Set column widths
  ws['!cols'] = [
    { wch: 20 }, // Index Number
    { wch: 25 }, // Student Name
    { wch: 15 }, // Total Amount
    { wch: 15 }, // Amount Paid
    { wch: 15 }, // Academic Year
    { wch: 12 }, // Semester
    { wch: 18 }, // Payment Method
    { wch: 60 }  // Note
  ];
  
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Payment Updates');
  
  // Save to excel-files directory
  const filePath = path.join(__dirname, 'excel-files', 'sample_payment_updates.xlsx');
  XLSX.writeFile(wb, filePath);
  
  console.log('✅ Generated sample_payment_updates.xlsx');
  console.log('   - 2 students (both owe fees from bulk upload):');
  console.log(`     1. ${student1['Index Number']} (${student1.Name}): Outstanding GHS ${student1Balance} → Pays GHS ${student1Balance + 1000} → Creates GHS 1000 credit`);
  console.log(`     2. ${student2['Index Number']} (${student2.Name}): Outstanding GHS ${student2Balance} → Pays exact GHS ${student2Balance} → Clears fee`);
  console.log('   - All payments via Bank Transfer\n');
}

generatePaymentUpdates();
