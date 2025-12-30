// models/message-model.js
const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true },
    reactions: [
      { userId: mongoose.Schema.Types.ObjectId, emoji: String }
    ],
    seenBy: [{ type: mongoose.Schema.Types.ObjectId }], // Legacy field, keeping if needed
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // New field for unread counts
    expiresAt: { type: Date } // For ephemeral messages in public rooms
  },
  { timestamps: true }
);

// TTL index - MongoDB will automatically delete documents when expiresAt is reached
messageSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Index for faster room queries
messageSchema.index({ roomId: 1, createdAt: 1 });

module.exports = mongoose.model('Message', messageSchema);
