const XLSX = require('xlsx');
const axios = require('axios');

const API_URL = 'http://localhost:5000';

async function testSmallUpload() {
  console.log('\n🧪 Testing upload with first 5 students...\n');

  // Read Excel file
  const wb = XLSX.readFile('./excel-files/sample_bulk_students.xlsx');
  const ws = wb.Sheets[wb.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

  const headers = data[0];
  console.log('Headers:', headers);

  // Parse first 5 students
  const students = data.slice(1, 6).map(row => ({
    name: row[0],
    index: row[1],
    email: row[2],
    program: row[3],
    department: row[4],
    admission_cycle: row[5],
    academic_year: row[6],
  }));

  console.log('\nParsed students:');
  students.forEach((s, i) => {
    console.log(`${i + 1}. ${s.name} | ${s.index} | ${s.program} | ${s.department} | ${s.academic_year}`);
  });

  try {
    console.log('\n📤 Sending to backend...\n');
    const response = await axios.post(`${API_URL}/api/students/enroll-bulk`, {
      students
    });

    console.log('✅ Response:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('❌ Error:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error.message);
    }
  }
}

testSmallUpload().catch(console.error);
