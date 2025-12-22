const Message = require('../models/message.model');

exports.sendMessage = async (req, res) => {
  const { roomId, content } = req.body;

  const message = await Message.create({
    roomId,
    senderId: req.user._id,
    content
  });

  res.json(message);
};

exports.getMessages = async (req, res) => {
  const messages = await Message.find({ roomId: req.params.roomId })
    .sort({ createdAt: -1 })
    .limit(50);

  res.json(messages);
};
