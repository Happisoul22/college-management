const API_URL = 'http://localhost:5000/api';

async function fetchAPI(endpoint, method = 'GET', body = null, token = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_URL}${endpoint}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : null
    });

    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`HTTP Error ${res.status}: ${errText}`);
    }

    return await res.json();
}

async function runTests() {
    try {
        console.log('--- Blockchain Integration Test (Achievements) ---');

        console.log('\n[1] Checking Blockchain Status...');
        const statusData = await fetchAPI('/blockchain/status');
        console.log('Blockchain Status:', statusData);
        if (!statusData.connected) throw new Error('Blockchain not connected');

        console.log('\n[2] Registering temporary student user...');
        const studentEmail = `student.${Date.now()}@example.com`;
        const studentData = {
            name: 'Blockchain Test Student',
            email: studentEmail,
            password: 'password123',
            role: 'Student',
            department: 'CSE',
            rollNumber: `BLOCK${Date.now()}`,
            year: 1,
            section: 'A'
        };
        const studentRes = await fetchAPI('/auth/register', 'POST', studentData);
        const token = studentRes.token;
        console.log('Student created. Token received.');

        console.log('\n[3] Adding an Achievement...');
        const achievementData = {
            title: 'Hackathon Winner',
            type: 'Technical',
            description: 'Won 1st prize at local hackathon',
            date: new Date().toISOString()
        };
        const achievementRes = await fetchAPI('/achievements', 'POST', achievementData, token);
        console.log('Achievement saved:', achievementRes.data._id);
        console.log('Blockchain TxHash:', achievementRes.data.blockchainTxHash);

        const recordId = achievementRes.data._id;

        console.log('\n[4] Verifying Achievement against Blockchain Hash...');
        const verifyRes = await fetchAPI(`/blockchain/verify/achievement/${recordId}`, 'GET', null, token);
        console.log('Verification Result:', verifyRes);

        if (verifyRes.verified) {
            console.log('\n✅ HYBRID BLOCKCHAIN INTEGRATION SUCCESSFUL!');
        } else {
            console.error('\n❌ VERIFICATION FAILED!');
        }

    } catch (err) {
        console.error('❌ Test execution error:', err.message);
    }
}

runTests();
