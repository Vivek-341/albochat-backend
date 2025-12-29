const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    isOnline: { type: Boolean, default: false },
    lastSeen: { type: Date },
    friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    friendRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Incoming requests
    sentFriendRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }] // Outgoing requests
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
