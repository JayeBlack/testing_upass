const XLSX = require('xlsx');
const path = require('path');

console.log('🔄 Generating payment files...\n');

// STEP 1: Generate bulk payments for all 300 students
function generateBulkPayments() {
  console.log('📊 Step 1: Generating bulk payments...');
  
  // Load student names from sample_bulk_students.xlsx
  const studentsFilePath = path.join(__dirname, '..', 'excel-files', 'sample_bulk_students.xlsx');
  const studentsWb = XLSX.readFile(studentsFilePath);
  const studentsWs = studentsWb.Sheets[studentsWb.SheetNames[0]];
  const students = XLSX.utils.sheet_to_json(studentsWs);
  
  const payments = [];
  const semesters = ['First', 'Second'];
  const academicYears = ['2023/2024', '2024/2025', '2025/2026'];
  
  // Generate 300 records with realistic payment scenarios
  for (let i = 0; i < students.length; i++) {
    const student = students[i];
    const semester = semesters[Math.floor(Math.random() * semesters.length)];
    const academicYear = academicYears[Math.floor(Math.random() * academicYears.length)];
    
    // Fee ranges (varied realistic amounts)
    const baseFee = 5000 + Math.floor(Math.random() * 8000); // Between 5000-13000
    const totalAmount = Math.round(baseFee / 100) * 100; // Round to nearest 100
    
    let amountPaid;
    let status;
    
    // Distribute payment scenarios realistically:
    // 40% fully paid, 35% partial payment (owing), 20% no payment, 5% overpaid
    const scenario = Math.random();
    
    if (scenario < 0.40) {
      // 40% - Fully paid
      amountPaid = totalAmount;
      status = 'Paid';
    } else if (scenario < 0.75) {
      // 35% - Partial payment (25% to 95% paid)
      const percentPaid = 0.25 + Math.random() * 0.70; // 25% to 95%
      amountPaid = Math.round(totalAmount * percentPaid / 100) * 100;
      status = 'Partial';
    } else if (scenario < 0.95) {
      // 20% - No payment yet
      amountPaid = 0;
      status = 'Unpaid';
    } else {
      // 5% - Overpaid (105% to 120% of total)
      const percentPaid = 1.05 + Math.random() * 0.15; // 105% to 120%
      amountPaid = Math.round(totalAmount * percentPaid / 100) * 100;
      status = 'Overpaid';
    }
    
    const outstandingBalance = totalAmount - amountPaid;
    
    payments.push({
      'Index Number': student['Index Number'],
      'Student Name': student['Name'],
      'Total Amount': totalAmount,
      'Amount Paid': amountPaid,
      'Outstanding Balance': outstandingBalance,
      'Academic Year': academicYear,
      'Semester': semester,
      'Payment Method': amountPaid > 0 ? 'Bank Transfer' : 'N/A',
      'Status': status
    });
  }
  
  // Create workbook
  const ws = XLSX.utils.json_to_sheet(payments);
  
  // Set column widths
  ws['!cols'] = [
    { wch: 20 }, // Index Number
    { wch: 25 }, // Student Name
    { wch: 15 }, // Total Amount
    { wch: 15 }, // Amount Paid
    { wch: 20 }, // Outstanding Balance
    { wch: 15 }, // Academic Year
    { wch: 12 }, // Semester
    { wch: 18 }, // Payment Method
    { wch: 12 }  // Status
  ];
  
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Bulk Payments');
  
  // Save to excel-files directory
  const filePath = path.join(__dirname, '..', 'excel-files', 'sample_bulk_payments.xlsx');
  XLSX.writeFile(wb, filePath);
  
  // Calculate statistics
  const stats = payments.reduce((acc, p) => {
    acc[p.Status] = (acc[p.Status] || 0) + 1;
    return acc;
  }, {});
  
  const avgBalance = payments
    .filter(p => p['Outstanding Balance'] > 0)
    .reduce((sum, p) => sum + p['Outstanding Balance'], 0) / payments.filter(p => p['Outstanding Balance'] > 0).length;
  
  const avgCredit = payments
    .filter(p => p['Outstanding Balance'] < 0)
    .reduce((sum, p) => sum + Math.abs(p['Outstanding Balance']), 0) / payments.filter(p => p['Outstanding Balance'] < 0).length;
  
  console.log('✅ Generated sample_bulk_payments.xlsx');
  console.log(`   - 300 student fee records with actual names`);
  console.log(`   - Payment Status Distribution:`);
  console.log(`     • Paid in Full: ${stats['Paid'] || 0} students (${Math.round((stats['Paid'] || 0) / 3)}%)`);
  console.log(`     • Partial Payment: ${stats['Partial'] || 0} students (${Math.round((stats['Partial'] || 0) / 3)}%)`);
  console.log(`     • Unpaid: ${stats['Unpaid'] || 0} students (${Math.round((stats['Unpaid'] || 0) / 3)}%)`);
  console.log(`     • Overpaid: ${stats['Overpaid'] || 0} students (${Math.round((stats['Overpaid'] || 0) / 3)}%)`);
  console.log(`   - Average Outstanding Balance: GHS ${Math.round(avgBalance || 0)}`);
  console.log(`   - Average Credit Balance: GHS ${Math.round(avgCredit || 0)}`);
  console.log(`   - All payments via Bank Transfer`);
  console.log(`   - Varied semesters: First, Second`);
  console.log(`   - Varied academic years: 2023/2024, 2024/2025, 2025/2026\n`);
  
  return payments;
}

// STEP 2: Generate payment updates based on bulk payments
function generatePaymentUpdates(bulkPayments) {
  console.log('💳 Step 2: Generating payment updates...');
  
  // Load student names from sample_bulk_students.xlsx
  const studentsFilePath = path.join(__dirname, '..', 'excel-files', 'sample_bulk_students.xlsx');
  const studentsWb = XLSX.readFile(studentsFilePath);
  const studentsWs = studentsWb.Sheets[studentsWb.SheetNames[0]];
  const students = XLSX.utils.sheet_to_json(studentsWs);
  
  // Find students who owe fees (first two with outstanding balance > 0)
  const studentsWithBalance = bulkPayments.filter(p => p['Outstanding Balance'] > 0 && p['Outstanding Balance'] < p['Total Amount']);
  
  if (studentsWithBalance.length < 2) {
    console.log('⚠️  Warning: Less than 2 students with outstanding balance. Regenerating bulk payments...');
    return;
  }
  
  const student1Payment = studentsWithBalance[0];
  const student2Payment = studentsWithBalance[1];
  
  const student1 = students.find(s => s['Index Number'] === student1Payment['Index Number']);
  const student2 = students.find(s => s['Index Number'] === student2Payment['Index Number']);
  
  const student1Balance = student1Payment['Outstanding Balance'];
  const student2Balance = student2Payment['Outstanding Balance'];
  const student1Total = student1Payment['Total Amount'];
  const student2Total = student2Payment['Total Amount'];
  
  const updates = [
    {
      'Index Number': student1Payment['Index Number'],
      'Student Name': student1.Name,
      'Total Amount': student1Total, // Original total fee
      'Amount Paid': student1Balance + 1000, // Overpayment by 1000
      'Academic Year': student1Payment['Academic Year'],
      'Semester': student1Payment['Semester'],
      'Payment Method': 'Bank Transfer',
      'Note': `Payment update: Overpays by GHS 1000 on outstanding balance of GHS ${student1Balance}`
    },
    {
      'Index Number': student2Payment['Index Number'],
      'Student Name': student2.Name,
      'Total Amount': student2Total, // Original total fee
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
  const filePath = path.join(__dirname, '..', 'excel-files', 'sample_payment_updates.xlsx');
  XLSX.writeFile(wb, filePath);
  
  console.log('✅ Generated sample_payment_updates.xlsx');
  console.log('   - 2 students (both owe fees from bulk upload):');
  console.log(`     1. ${student1['Index Number']} (${student1.Name}): Outstanding GHS ${student1Balance} → Pays GHS ${student1Balance + 1000} → Creates GHS 1000 credit`);
  console.log(`     2. ${student2['Index Number']} (${student2.Name}): Outstanding GHS ${student2Balance} → Pays exact GHS ${student2Balance} → Clears fee`);
  console.log('   - All payments via Bank Transfer\n');
}

// Run both generators
try {
  const bulkPayments = generateBulkPayments();
  generatePaymentUpdates(bulkPayments);
  console.log('🎉 All payment files generated successfully!');
} catch (error) {
  console.error('❌ Error generating files:', error.message);
  console.error('   Make sure sample_bulk_payments.xlsx is closed in Excel before running this script.');
}
