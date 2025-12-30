const router = require('express').Router();
const { protect } = require('../middleware/auth-middleware');
const ctrl = require('../controllers/user-controller');

// Search users
router.get('/search', protect, ctrl.searchUsers);
router.get('/profile', protect, ctrl.getProfile);

module.exports = router;
