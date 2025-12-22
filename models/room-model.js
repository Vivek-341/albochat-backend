const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema(
  {
    name: String,
    type: { type: String, enum: ['dm', 'group'], required: true },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    admin: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Room', roomSchema);
