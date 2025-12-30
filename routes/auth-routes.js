// routes/auth-routes.js
const router = require('express').Router();
const { register, login, logout, verify } = require('../controllers/auth-controller');
const { protect } = require('../middleware/auth-middleware');

router.post('/register', register);
router.post('/verify', verify);
router.post('/login', login);
router.post('/logout', protect, logout);

module.exports = router;
