// controllers/room-controller.js
const Room = require('../models/room-model');

exports.createDMRoom = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: 'userId is required' });
    }

    // Check if DM room already exists
    let room = await Room.findOne({
      type: 'dm',
      members: { $all: [req.user._id, userId], $size: 2 }
    }).populate('members', 'username email');

    if (!room) {
      room = await Room.create({
        type: 'dm',
        members: [req.user._id, userId]
      });

      // Populate after creation
      room = await Room.findById(room._id).populate('members', 'username email');
    }

    res.status(201).json(room);
  } catch (error) {
    console.error('Create DM error:', error);
    res.status(500).json({ message: 'Server error creating DM' });
  }
};

exports.createGroupRoom = async (req, res) => {
  try {
    const { name, members } = req.body;

    if (!name || !members || !Array.isArray(members)) {
      return res.status(400).json({ message: 'name and members array are required' });
    }

    // Include current user in members if not already included
    const allMembers = members.includes(req.user._id.toString())
      ? members
      : [...members, req.user._id];

    const room = await Room.create({
      name,
      type: 'group',
      members: allMembers,
      admin: req.user._id
    });

    // Populate members
    const populatedRoom = await Room.findById(room._id).populate('members', 'username email');

    res.status(201).json(populatedRoom);
  } catch (error) {
    console.error('Create group error:', error);
    res.status(500).json({ message: 'Server error creating group' });
  }
};

exports.getUserRooms = async (req, res) => {
  try {
    const rooms = await Room.find({ members: req.user._id })
      .populate('members', 'username email')
      .sort({ updatedAt: -1 });

    res.json(rooms);
  } catch (error) {
    console.error('Get rooms error:', error);
    res.status(500).json({ message: 'Server error fetching rooms' });
  }
};
