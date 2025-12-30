// models/room-model.js
const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema(
  {
    name: String,
    description: String,
    type: { type: String, enum: ['dm', 'group'], required: true },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    admin: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isPublic: { type: Boolean, default: true },
    password: { type: String }, // Hashed password for private rooms
    isDefault: { type: Boolean, default: false }, // For default public rooms

    // DM Request Logic
    status: { type: String, enum: ['active', 'pending'], default: 'active' },
    initiator: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // Privacy & Actions
    hiddenBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    blockedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    bannedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }] // Banned users
  },
  { timestamps: true }
);

// Index for faster queries
roomSchema.index({ isPublic: 1, isDefault: 1 });

module.exports = mongoose.model('Room', roomSchema);
