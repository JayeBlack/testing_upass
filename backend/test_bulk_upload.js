const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const API_URL = process.env.API_URL || 'http://localhost:5000';
const FILE_PATH = path.join(__dirname, '..', 'excel-files', 'sample_bulk_students.xlsx');

// ANSI color codes for terminal
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
};

function log(msg, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

function formatTime(ms) {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

async function testBulkStudentUpload() {
  log('\n' + '='.repeat(70), 'bright');
  log('  🧪 BULK STUDENT UPLOAD - PERFORMANCE TEST', 'bright');
  log('='.repeat(70) + '\n', 'bright');

  // Check if file exists
  if (!fs.existsSync(FILE_PATH)) {
    log('❌ Error: Sample file not found!', 'red');
    log(`   Expected: ${FILE_PATH}`, 'dim');
    log('   Run: node backend/Might_Need/generate_bulk_students.js', 'yellow');
    process.exit(1);
  }

  const fileStats = fs.statSync(FILE_PATH);
  log('📄 File Information:', 'cyan');
  log(`   Path: ${FILE_PATH}`, 'dim');
  log(`   Size: ${(fileStats.size / 1024).toFixed(2)} KB`, 'dim');
  log('');

  const globalStartTime = Date.now();

  try {
    // ========== STEP 1: PARSE FILE ==========
    log('📊 STEP 1: Parsing Excel file...', 'blue');
    const parseStartTime = Date.now();

    const parseForm = new FormData();
    parseForm.append('file', fs.createReadStream(FILE_PATH));

    const parseResponse = await axios.post(`${API_URL}/api/students/parse-bulk`, parseForm, {
      headers: parseForm.getHeaders(),
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });

    const parseTime = Date.now() - parseStartTime;
    const parsedStudents = parseResponse.data.rows;

    log(`   ✅ Parse completed: ${formatTime(parseTime)}`, 'green');
    log(`   📋 Valid records: ${parsedStudents.length}`, 'dim');
    
    // Show sample parsed data
    if (parsedStudents.length > 0) {
      const sample = parsedStudents[0];
      log('\n   Sample parsed record:', 'dim');
      log(`      Name: ${sample.name}`, 'dim');
      log(`      Index: ${sample.index}`, 'dim');
      log(`      Email: ${sample.email}`, 'dim');
      log(`      Programme: ${sample.program}`, 'dim');
      log(`      Department: ${sample.department}`, 'dim');
      log(`      Cohort: ${sample.admission_cycle}`, 'dim');
      log(`      Academic Year: ${sample.academic_year || 'Not specified'}`, 'dim');
    }
    log('');

    if (!parsedStudents.length) {
      log('⚠️  Warning: No valid records found in file!', 'yellow');
      process.exit(1);
    }

    // ========== STEP 2: ENROLL STUDENTS ==========
    log('💾 STEP 2: Enrolling students in database...', 'blue');
    const enrollStartTime = Date.now();

    const enrollResponse = await axios.post(`${API_URL}/api/students/enroll-bulk`, {
      students: parsedStudents,
    });

    const enrollTime = Date.now() - enrollStartTime;
    const enrolled = enrollResponse.data.enrolled || [];
    const errors = enrollResponse.data.errors || [];

    log(`   ✅ Enrollment completed: ${formatTime(enrollTime)}`, 'green');
    log(`   ✅ Successfully enrolled: ${enrolled.length} students`, 'green');
    
    if (errors.length > 0) {
      log(`   ⚠️  Errors encountered: ${errors.length}`, 'yellow');
      log('\n   First 5 errors:', 'yellow');
      errors.slice(0, 5).forEach((err, idx) => {
        log(`      ${idx + 1}. ${err}`, 'dim');
      });
      if (errors.length > 5) {
        log(`      ... and ${errors.length - 5} more`, 'dim');
      }
    }
    log('');

    // ========== STEP 3: VERIFY IN DATABASE ==========
    log('🔍 STEP 3: Verifying students in database...', 'blue');
    const verifyStartTime = Date.now();

    const verifyResponse = await axios.get(`${API_URL}/api/students?limit=1000`);
    const verifyTime = Date.now() - verifyStartTime;
    
    const totalStudents = verifyResponse.data.pagination?.total || verifyResponse.data.data?.length || 0;
    
    log(`   ✅ Verification completed: ${formatTime(verifyTime)}`, 'green');
    log(`   📊 Total students in database: ${totalStudents}`, 'dim');
    log('');

    // Show sample enrolled students
    if (verifyResponse.data.data && verifyResponse.data.data.length > 0) {
      log('   Sample enrolled students (first 5):', 'dim');
      verifyResponse.data.data.slice(0, 5).forEach((s, idx) => {
        log(`      ${idx + 1}. ${s.first_name} ${s.last_name} (${s.index_number}) - ${s.program_name || 'No Program'}`, 'dim');
      });
    }
    log('');

    // ========== PERFORMANCE SUMMARY ==========
    const totalTime = Date.now() - globalStartTime;
    const recordsPerSecond = (parsedStudents.length / (totalTime / 1000)).toFixed(2);
    const successRate = ((enrolled.length / parsedStudents.length) * 100).toFixed(1);

    log('='.repeat(70), 'bright');
    log('  📊 PERFORMANCE SUMMARY', 'bright');
    log('='.repeat(70), 'bright');
    log('');
    log(`  Parse Time:        ${formatTime(parseTime)}`, 'cyan');
    log(`  Enroll Time:       ${formatTime(enrollTime)}`, 'cyan');
    log(`  Verify Time:       ${formatTime(verifyTime)}`, 'cyan');
    log(`  Total Time:        ${formatTime(totalTime)}`, 'bright');
    log('');
    log(`  Records Processed: ${parsedStudents.length}`, 'cyan');
    log(`  Successfully Added: ${enrolled.length}`, 'green');
    log(`  Errors:            ${errors.length}`, errors.length > 0 ? 'yellow' : 'green');
    log(`  Success Rate:      ${successRate}%`, 'cyan');
    log(`  Throughput:        ${recordsPerSecond} records/sec`, 'cyan');
    log('');
    
    // Performance rating
    if (totalTime < 30000) {
      log('  ⚡ Performance Rating: EXCELLENT', 'green');
    } else if (totalTime < 60000) {
      log('  ✅ Performance Rating: GOOD', 'green');
    } else if (totalTime < 120000) {
      log('  ⚠️  Performance Rating: ACCEPTABLE', 'yellow');
    } else {
      log('  ❌ Performance Rating: NEEDS OPTIMIZATION', 'red');
    }

    log('');
    log('='.repeat(70), 'bright');
    log('  ✅ TEST COMPLETED SUCCESSFULLY', 'green');
    log('='.repeat(70) + '\n', 'bright');

  } catch (error) {
    log('\n' + '='.repeat(70), 'red');
    log('  ❌ TEST FAILED', 'red');
    log('='.repeat(70), 'red');
    log('');
    
    if (error.response) {
      log(`  HTTP Status: ${error.response.status}`, 'red');
      log(`  Error: ${JSON.stringify(error.response.data, null, 2)}`, 'dim');
    } else if (error.request) {
      log('  Error: No response from server', 'red');
      log('  Make sure the backend is running on ' + API_URL, 'yellow');
    } else {
      log(`  Error: ${error.message}`, 'red');
    }
    
    log('');
    log('='.repeat(70) + '\n', 'red');
    process.exit(1);
  }
}

// Check if backend is running
log('\n🔌 Checking backend connection...', 'cyan');
axios.get(`${API_URL}/api/students?limit=1`).then(() => {
  log('✅ Backend is online\n', 'green');
  testBulkStudentUpload();
}).catch((err) => {
  log('❌ Cannot connect to backend!', 'red');
  log(`   URL: ${API_URL}`, 'dim');
  log('   Make sure the backend server is running', 'yellow');
  log('   Run: cd backend && npm run dev\n', 'yellow');
  process.exit(1);
});
