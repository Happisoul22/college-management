const axios = require('axios');

async function testDeptUsers() {
    try {
        const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
            email: 'sumanthsathala10@gmail.com',
            password: 'password123'
        });
        const token = loginRes.data.token;
        console.log('Login successful. Token acquired.');

        const id = 'acf8caf3-c83a-402d-b44a-b959b22aef4f'; // arfeen

        console.log("1. /analytics/department-users");
        const res1 = await axios.get(`http://localhost:5000/api/analytics/department-users?type=Student`, { headers: { Authorization: `Bearer ${token}` } });
        console.log(!!res1.data.data.find(u => u.id === id) ? 'success' : 'not found');

        console.log("2. /marks");
        const res2 = await axios.get(`http://localhost:5000/api/marks?student=${id}`, { headers: { Authorization: `Bearer ${token}` } });
        console.log('success');

        console.log("3. /marks/cgpa");
        const res3 = await axios.get(`http://localhost:5000/api/marks/cgpa/${id}`, { headers: { Authorization: `Bearer ${token}` } });
        console.log('success');

        console.log("4. /attendance/summary");
        const res4 = await axios.get(`http://localhost:5000/api/attendance/summary/${id}`, { headers: { Authorization: `Bearer ${token}` } });
        console.log('success');

        console.log("5. /achievements");
        const res5 = await axios.get(`http://localhost:5000/api/achievements?student=${id}`, { headers: { Authorization: `Bearer ${token}` } });
        console.log('success');

    } catch (err) {
        console.error('Error on endpoint:', err.request?.path || err.message);
        console.error('Details:', err.response?.data);
    }
}

testDeptUsers();
