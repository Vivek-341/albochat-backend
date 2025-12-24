// controllers/message-controller.js
const Message = require('../models/message-model');

exports.sendMessage = async (req, res) => {
  try {
    const { roomId, content } = req.body;

    if (!roomId || !content) {
      return res.status(400).json({ message: 'roomId and content are required' });
    }

    const message = await Message.create({
      roomId,
      senderId: req.user._id,
      content
    });

    // Populate sender info before sending response
    const populatedMessage = await Message.findById(message._id)
      .populate('senderId', 'username email');

    res.status(201).json(populatedMessage);
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ message: 'Server error sending message' });
  }
};

exports.getMessages = async (req, res) => {
  try {
    const { roomId } = req.params;

    const messages = await Message.find({ roomId })
      .populate('senderId', 'username email')
      .sort({ createdAt: 1 }) // Ascending order (oldest first)
      .limit(100);

    res.json(messages);
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ message: 'Server error fetching messages' });
  }
};
