// controllers/room-controller.js
const Room = require('../models/room-model');
const bcrypt = require('bcryptjs');

// Get all public rooms (including default rooms)
exports.getPublicRooms = async (req, res) => {
  try {
    const publicRooms = await Room.find({ isPublic: true })
      .populate('members', 'username email')
      .populate('admin', 'username email')
      .sort({ isDefault: -1, createdAt: -1 }); // Default rooms first

    res.json(publicRooms);
  } catch (error) {
    console.error('Get public rooms error:', error);
    res.status(500).json({ message: 'Server error fetching public rooms' });
  }
};

// Get user's rooms (DMs + joined groups)
exports.getUserRooms = async (req, res) => {
  try {
    const rooms = await Room.find({ members: req.user._id })
      .populate('members', 'username email')
      .populate('admin', 'username email')
      .sort({ updatedAt: -1 });

    res.json(rooms);
  } catch (error) {
    console.error('Get rooms error:', error);
    res.status(500).json({ message: 'Server error fetching rooms' });
  }
};

// Create DM room (existing functionality)
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
        isPublic: false, // DMs are always private
        members: [req.user._id, userId]
      });

      room = await Room.findById(room._id).populate('members', 'username email');
    }

    res.status(201).json(room);
  } catch (error) {
    console.error('Create DM error:', error);
    res.status(500).json({ message: 'Server error creating DM' });
  }
};

// Create group room (existing functionality - kept for backward compatibility)
exports.createGroupRoom = async (req, res) => {
  try {
    const { name, members } = req.body;

    if (!name || !members || !Array.isArray(members)) {
      return res.status(400).json({ message: 'name and members array are required' });
    }

    const allMembers = members.includes(req.user._id.toString())
      ? members
      : [...members, req.user._id];

    const room = await Room.create({
      name,
      type: 'group',
      members: allMembers,
      admin: req.user._id,
      isPublic: true // Default to public for backward compatibility
    });

    const populatedRoom = await Room.findById(room._id)
      .populate('members', 'username email')
      .populate('admin', 'username email');

    res.status(201).json(populatedRoom);
  } catch (error) {
    console.error('Create group error:', error);
    res.status(500).json({ message: 'Server error creating group' });
  }
};

// Create new room (public or private)
exports.createRoom = async (req, res) => {
  try {
    const { name, isPublic, password, members } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Room name is required' });
    }

    // Validate private room has password
    if (isPublic === false && !password) {
      return res.status(400).json({ message: 'Private rooms require a password' });
    }

    // Hash password if provided
    let hashedPassword = null;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    // Prepare members list
    const membersList = members && Array.isArray(members) ? members : [];
    if (!membersList.includes(req.user._id.toString())) {
      membersList.push(req.user._id);
    }

    const room = await Room.create({
      name,
      type: 'group',
      isPublic: isPublic !== false, // Default to public if not specified
      password: hashedPassword,
      members: membersList,
      admin: req.user._id,
      isDefault: false
    });

    const populatedRoom = await Room.findById(room._id)
      .populate('members', 'username email')
      .populate('admin', 'username email');

    res.status(201).json(populatedRoom);
  } catch (error) {
    console.error('Create room error:', error);
    res.status(500).json({ message: 'Server error creating room' });
  }
};

// Join private room with roomId and password
exports.joinPrivateRoom = async (req, res) => {
  try {
    const { roomId, password } = req.body;

    if (!roomId || !password) {
      return res.status(400).json({ message: 'roomId and password are required' });
    }

    // Find room
    const room = await Room.findById(roomId);

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Check if room is private
    if (room.isPublic) {
      return res.status(400).json({ message: 'This is a public room, no password needed' });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, room.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid password' });
    }

    // Check if user is already a member
    if (room.members.includes(req.user._id)) {
      const populatedRoom = await Room.findById(room._id)
        .populate('members', 'username email')
        .populate('admin', 'username email');
      return res.json(populatedRoom);
    }

    // Add user to members
    room.members.push(req.user._id);
    await room.save();

    const populatedRoom = await Room.findById(room._id)
      .populate('members', 'username email')
      .populate('admin', 'username email');

    res.json(populatedRoom);
  } catch (error) {
    console.error('Join private room error:', error);
    res.status(500).json({ message: 'Server error joining private room' });
  }
};

// Join public room (no password required)
exports.joinPublicRoom = async (req, res) => {
  try {
    const { roomId } = req.body;

    if (!roomId) {
      return res.status(400).json({ message: 'roomId is required' });
    }

    const room = await Room.findById(roomId);

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    if (!room.isPublic) {
      return res.status(400).json({ message: 'This is a private room, password required' });
    }

    // Check if user is already a member
    if (room.members.includes(req.user._id)) {
      const populatedRoom = await Room.findById(room._id)
        .populate('members', 'username email')
        .populate('admin', 'username email');
      return res.json(populatedRoom);
    }

    // Add user to members
    room.members.push(req.user._id);
    await room.save();

    const populatedRoom = await Room.findById(room._id)
      .populate('members', 'username email')
      .populate('admin', 'username email');

    res.json(populatedRoom);
  } catch (error) {
    console.error('Join public room error:', error);
    res.status(500).json({ message: 'Server error joining public room' });
  }
};
