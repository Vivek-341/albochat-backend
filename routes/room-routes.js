// routes/room-routes.js
const router = require('express').Router();
const { protect } = require('../middleware/auth-middleware');
const ctrl = require('../controllers/room-controller');

router.post('/dm', protect, ctrl.createDMRoom);
router.post('/group', protect, ctrl.createGroupRoom);
router.get('/', protect, ctrl.getUserRooms);

module.exports = router;
