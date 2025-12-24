// routes/message-routes.js
const router = require('express').Router();
const { protect } = require('../middleware/auth-middleware');
const ctrl = require('../controllers/message-controller');

router.post('/', protect, ctrl.sendMessage);
router.get('/:roomId', protect, ctrl.getMessages);

module.exports = router;
