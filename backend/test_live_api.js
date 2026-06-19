const http = require('http');

function testAPI() {
  console.log('🔍 Testing Live API Endpoint\n');
  console.log('=' .repeat(60));
  
  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/analytics/overview',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  console.log('\n📡 Making request to: http://localhost:5000/api/analytics/overview\n');

  const req = http.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      console.log(`Status Code: ${res.statusCode}\n`);
      
      if (res.statusCode === 200) {
        try {
          const json = JSON.parse(data);
          console.log('✅ Response received:\n');
          console.log(JSON.stringify(json, null, 2));
          console.log('\n' + '='.repeat(60));
          console.log(`\n📊 Total Students: ${json.total_students}`);
          console.log(`📊 Active Students: ${json.active_students}`);
        } catch (err) {
          console.log('❌ Error parsing JSON:', err.message);
          console.log('Raw response:', data);
        }
      } else {
        console.log('❌ Error response:');
        console.log(data);
      }
      
      process.exit(0);
    });
  });

  req.on('error', (error) => {
    console.error('❌ Connection Error:', error.message);
    console.error('\n⚠️  Backend server may not be running!');
    console.error('   Start it with: cd backend && npm run dev\n');
    process.exit(1);
  });

  req.end();
}

testAPI();
