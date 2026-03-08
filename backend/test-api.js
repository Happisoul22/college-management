const axios = require('axios');
const fs = require('fs');

async function test() {
    try {
        // Authenticate to get a token
        const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
            email: 'alluarfeen9911@gmail.com', // correct student email
            password: 'password123'
        });
        const token = loginRes.data.token;
        
        // Fetch achievements
        const res = await axios.get('http://localhost:5000/api/achievements', {
            headers: { Authorization: `Bearer ${token}` }
        });
        fs.writeFileSync('test-api-output.json', JSON.stringify(res.data.data, null, 2));
        console.log("Written to test-api-output.json");
    } catch (e) {
        console.error("Error:", e.response ? e.response.data : e.message);
    }
}
test();
