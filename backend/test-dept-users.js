const axios = require('axios');

async function testDeptUsers() {
    try {
        const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
            email: 'sumanthsathala10@gmail.com',
            password: 'password123'
        });
        const token = loginRes.data.token;
        console.log('Login successful. Token acquired.');

        const res = await axios.get('http://localhost:5000/api/analytics/department-users?type=Student', {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        
        console.log(`Found ${res.data.count} students.`);
        // console.log(JSON.stringify(res.data.data, null, 2));

        const arfeen = res.data.data.find(u => u.id === 'acf8caf3-c83a-402d-b44a-b959b22aef4f');
        console.log('Arfeen found:', !!arfeen);
        if (arfeen) console.log(arfeen.name);

    } catch (err) {
        console.error('Error:', err.response ? err.response.data : err.message);
    }
}

testDeptUsers();
