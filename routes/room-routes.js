// routes/room-routes.js
const router = require('express').Router();
const { protect } = require('../middleware/auth-middleware');
const ctrl = require('../controllers/room-controller');

// Get public rooms
router.get('/public', protect, ctrl.getPublicRooms);

// Get user's rooms
router.get('/', protect, ctrl.getUserRooms);

// Create new room (public or private)
router.post('/create', protect, ctrl.createRoom);

// Join public room
router.post('/join-public', protect, ctrl.joinPublicRoom);

// Join private room with password
router.post('/join-private', protect, ctrl.joinPrivateRoom);

// Delete room (admin only)
router.delete('/:roomId', protect, ctrl.deleteRoom);

// Legacy endpoints (kept for backward compatibility)
// DM Requests
// DM Actions
router.post('/dm', protect, ctrl.createDMRoom);
router.post('/dm/accept', protect, ctrl.acceptDM);
router.delete('/dm/:roomId', protect, ctrl.ignoreDM); // Used for reject/ignore request
router.put('/:roomId/hide', protect, ctrl.hideRoom);
router.put('/:roomId/block', protect, ctrl.blockDM);

router.post('/group', protect, ctrl.createGroupRoom);

module.exports = router;
