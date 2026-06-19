const fetch = require('node-fetch');

async function testEndpoint() {
  try {
    // You'll need to replace this with a valid JWT token from your admin user
    const token = "YOUR_ADMIN_JWT_TOKEN_HERE";
    
    const response = await fetch('http://localhost:5000/api/analytics/overview', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error:', err.message);
  }
}

testEndpoint();
