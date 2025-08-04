// Quick test for updated authentication with single name field
const API_BASE = 'http://localhost:3000/api/auth';

async function testUpdatedAuth() {
  console.log('🧪 Testing Updated Authentication with Single Name Field...\n');

  // Test signup with single name
  const signupData = {
    name: "John Doe",
    email: "john.doe.test@example.com",
    password: "SecurePassword123!",
    role: "user"
  };

  try {
    console.log('📝 Testing Signup with single name field...');
    console.log('Request:', JSON.stringify(signupData, null, 2));
    
    const response = await fetch(`${API_BASE}/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(signupData)
    });

    const data = await response.json();
    console.log('\n✅ Signup Response:');
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));

    if (data.success) {
      console.log('\n🎉 Success! User created with single name field');
      console.log('User name:', data.data.user.name);
      console.log('User email:', data.data.user.email);
      console.log('Token received:', !!data.data.tokens.accessToken);
    } else {
      console.log('\n❌ Signup failed:', data.error);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Wait a moment for server to be ready, then run test
setTimeout(testUpdatedAuth, 1000);