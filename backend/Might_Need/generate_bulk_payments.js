const XLSX = require('xlsx');
const path = require('path');

// Generate realistic bulk payments for ALL 300 students
// Mix of: paid in full, partial payments (owing), overpayments (credit balance)
// All payments via Bank Transfer
function generateBulkPayments() {
  // First, load student names from sample_bulk_students.xlsx
  const studentsFilePath = path.join(__dirname, 'excel-files', 'sample_bulk_students.xlsx');
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
    
    // Fee ranges based on program level (varied realistic amounts)
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
  const filePath = path.join(__dirname, 'excel-files', 'sample_bulk_payments.xlsx');
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
}

generateBulkPayments();
