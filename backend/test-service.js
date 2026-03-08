require('dotenv').config();
const mongoose = require('mongoose');
const blockchain = require('./services/blockchain');

async function runDirectTest() {
    try {
        console.log('--- Direct Blockchain Service Test ---');

        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/academic-analytics', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('MongoDB Connected');

        // Initialize Blockchain
        await blockchain.initBlockchain();
        const status = await blockchain.getStatus();
        console.log('Blockchain Status:', status);

        if (!status.connected) {
            throw new Error('Blockchain not connected, aborting test.');
        }

        // 1. Create a dummy data object
        const dummyId = new mongoose.Types.ObjectId();
        const dummyData = {
            student: new mongoose.Types.ObjectId(),
            subject: new mongoose.Types.ObjectId(),
            date: new Date(),
            status: 'Present',
            period: 1,
            _id: dummyId,
            __v: 0
        };

        // 2. Store on blockchain
        console.log('\n[1] Storing record hash on blockchain...');
        const storeResult = await blockchain.storeRecordHash('attendance', dummyId, dummyData);
        console.log('Store Result:', storeResult);

        if (!storeResult || !storeResult.txHash) {
            throw new Error('Failed to store record hash');
        }

        // 3. Verify record
        console.log('\n[2] Verifying record hash against blockchain...');
        const verifyResult = await blockchain.verifyRecordHash('attendance', dummyId, dummyData);
        console.log('Verify Result (Match expected):', verifyResult);

        if (verifyResult.verified) {
            console.log('✅ VERIFICATION SUCCESSFUL: Hashes match');
        } else {
            console.error('❌ VERIFICATION FAILED: Hashes do not match');
        }

        // 4. Verify with tampered data
        console.log('\n[3] Verifying with tampered data (Status changed to Absent)...');
        const tamperedData = { ...dummyData, status: 'Absent' };
        const tamperedVerifyResult = await blockchain.verifyRecordHash('attendance', dummyId, tamperedData);
        console.log('Tampered Verify Result (Mismatch expected):', tamperedVerifyResult);

        if (!tamperedVerifyResult.verified) {
            console.log('✅ TAMPER DETECTION SUCCESS: Tampering was detected');
        } else {
            console.error('❌ TAMPER DETECTION FAILED: Tampering was ignored');
        }

    } catch (error) {
        console.error('Test Error:', error);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
}

runDirectTest();
