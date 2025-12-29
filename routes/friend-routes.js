const router = require('express').Router();
const { protect } = require('../middleware/auth-middleware');
const ctrl = require('../controllers/friend-controller');

router.post('/request', protect, ctrl.sendRequest);
router.post('/accept', protect, ctrl.acceptRequest);
router.delete('/reject/:requesterId', protect, ctrl.rejectRequest);
router.get('/', protect, ctrl.getFriends);
router.get('/requests', protect, ctrl.getRequests);
router.get('/status/:targetUserId', protect, ctrl.getFriendStatus);

module.exports = router;
