const fetch = require('node-fetch');

async function testAPI() {
  try {
    // Test getting all supervisors
    const supervisors = await fetch('http://localhost:5000/api/supervisors');
    const supData = await supervisors.json();
    console.log('All supervisors:', JSON.stringify(supData, null, 2));

    // Test getting Prof Perry's students (supervisor_id = 2)
    const students = await fetch('http://localhost:5000/api/supervisors/2/students');
    const studData = await students.json();
    console.log('\nProf Perry students:', JSON.stringify(studData, null, 2));
  } catch (err) {
    console.error('Error:', err.message);
  }
}

testAPI();
