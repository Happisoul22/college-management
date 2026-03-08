const axios = require('axios');

async function testCounsellor() {
    try {
        // 1. Login as sumanth to get token
        const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
            email: 'sumanthsathala10@gmail.com', // correct email
            password: 'password123'
        });
        const token = loginRes.data.token;
        console.log('Login successful. Token acquired.');

        // 2. Fetch counsellor assignments
        const assignmentsRes = await axios.get('http://localhost:5000/api/assignments/counsellor/my', {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        
        console.log('\n--- MY COUNSELLOR ASSIGNMENTS ---');
        console.log(JSON.stringify(assignmentsRes.data, null, 2));
        
    } catch (err) {
        console.error('Error:', err.response ? err.response.data : err.message);
    }
}

testCounsellor();
