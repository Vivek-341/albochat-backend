// controllers/message-controller.js
const Message = require('../models/message-model');
const Room = require('../models/room-model');

exports.sendMessage = async (req, res) => {
  try {
    const { roomId, content } = req.body;

    if (!roomId || !content) {
      return res.status(400).json({ message: 'roomId and content are required' });
    }

    // Get room and enforce access control
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // If room is private, ensure user is a member
    if (!room.isPublic) {
      const isMember = room.members.map(m => String(m)).includes(String(req.user._id));
      if (!isMember) return res.status(403).json({ message: 'Forbidden - not a member of this private room' });
    }

    // Calculate expiration for public rooms (24 hours from now)
    let expiresAt = null;
    if (room.isPublic) {
      expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours from now
    }

    const message = await Message.create({
      roomId,
      senderId: req.user._id,
      content,
      expiresAt // Will be null for private rooms, set for public rooms
    });

    // Populate sender info before sending response
    const populatedMessage = await Message.findById(message._id)
      .populate('senderId', 'username email isOnline lastSeen');

    res.status(201).json(populatedMessage);
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ message: 'Server error sending message' });
  }
};

exports.getMessages = async (req, res) => {
  try {
    const { roomId } = req.params;

    // Only fetch messages that haven't expired
    // MongoDB TTL will delete expired messages, but we add this as extra safety
    const now = new Date();

    // Ensure access: if private room, user must be member
    const room = await Room.findById(roomId);
    if (!room) return res.status(404).json({ message: 'Room not found' });

    if (!room.isPublic) {
      const isMember = room.members.map(m => String(m)).includes(String(req.user._id));
      if (!isMember) return res.status(403).json({ message: 'Forbidden - not a member of this private room' });
    }

    const messages = await Message.find({
      roomId,
      $or: [
        { expiresAt: null }, // Private room messages (no expiration)
        { expiresAt: { $gt: now } } // Public room messages not yet expired
      ]
    })
      .populate('senderId', 'username email isOnline lastSeen')
      .sort({ createdAt: 1 }) // Ascending order (oldest first)
      .limit(100);

    res.json(messages);
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ message: 'Server error fetching messages' });
  }
};
