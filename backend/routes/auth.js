const express = require('express');
const { register, login, getMe, logout, updateProfile, sendRegistrationOtp, sendUpdateOtp } = require('../controllers/auth');

const router = express.Router();

const { protect } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.post('/send-registration-otp', sendRegistrationOtp);
router.post('/send-update-otp', protect, sendUpdateOtp);
router.get('/me', protect, getMe);
router.put('/updateprofile', protect, updateProfile);
router.get('/logout', logout);

module.exports = router;
