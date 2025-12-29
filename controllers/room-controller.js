// controllers/room-controller.js
const Room = require('../models/room-model');
const bcrypt = require('bcryptjs');

// Get all public rooms (including default rooms)
exports.getPublicRooms = async (req, res) => {
  try {
    const publicRooms = await Room.find({
      isPublic: true,
      hiddenBy: { $ne: req.user._id }
    })
      .populate('members', 'username email isOnline lastSeen')
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
    // Public rooms visible to everyone
    const publicRooms = await Room.find({
      isPublic: true,
      hiddenBy: { $ne: req.user._id }
    })
      .populate('members', 'username email isOnline lastSeen')
      .populate('admin', 'username email')
      .sort({ isDefault: -1, createdAt: -1 });

    // Rooms where user is a member (including private DMs and groups)
    const memberRooms = await Room.find({
      members: req.user._id,
      hiddenBy: { $ne: req.user._id }
    })
      .populate('members', 'username email isOnline lastSeen')
      .populate('admin', 'username email')
      .sort({ updatedAt: -1 });

    // Combine and deduplicate by _id - ensure user's private rooms are included
    const map = new Map();
    for (const r of publicRooms) map.set(String(r._id), r);
    for (const r of memberRooms) map.set(String(r._id), r);

    const combined = Array.from(map.values());

    res.json(combined);
  } catch (error) {
    console.error('Get rooms error:', error);
    res.status(500).json({ message: 'Server error fetching rooms' });
  }
};

// Hide Room
exports.hideRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    await Room.findByIdAndUpdate(roomId, {
      $addToSet: { hiddenBy: req.user._id }
    });
    res.json({ message: 'Room hidden' });
  } catch (error) {
    console.error('Hide room error:', error);
    res.status(500).json({ message: 'Server error hiding room' });
  }
};

// Block DM
exports.blockDM = async (req, res) => {
  try {
    const { roomId } = req.params;
    await Room.findByIdAndUpdate(roomId, {
      $addToSet: { blockedBy: req.user._id, hiddenBy: req.user._id },
    });
    res.json({ message: 'DM blocked' });
  } catch (error) {
    console.error('Block DM error:', error);
    res.status(500).json({ message: 'Server error blocking DM' });
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
        members: [req.user._id, userId],
        status: 'pending',
        initiator: req.user._id
      });

      room = await Room.findById(room._id).populate('members', 'username email');
    }

    res.status(201).json(room);
  } catch (error) {
    console.error('Create DM error:', error);
    res.status(500).json({ message: 'Server error creating DM' });
  }
};

// Accept DM Request
exports.acceptDM = async (req, res) => {
  try {
    const { roomId } = req.body;

    const room = await Room.findById(roomId);
    if (!room) return res.status(404).json({ message: 'Room not found' });

    // Authorization: Only non-initiator can accept
    if (room.initiator.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot accept your own request' });
    }

    room.status = 'active';
    await room.save();

    const populatedRoom = await Room.findById(room._id)
      .populate('members', 'username email');

    res.json(populatedRoom);
  } catch (error) {
    console.error('Accept DM error:', error);
    res.status(500).json({ message: 'Server error accepting DM' });
  }
};

// Ignore/Reject DM Request
exports.ignoreDM = async (req, res) => {
  try {
    const { roomId } = req.params;

    const room = await Room.findById(roomId);
    if (!room) return res.status(404).json({ message: 'Room not found' });

    // Authorization: Member check
    if (!room.members.includes(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await Room.findByIdAndDelete(roomId);
    // Also delete messages just in case any were sent (unlikely if pending, but safe cleanup)
    const Message = require('../models/message-model');
    await Message.deleteMany({ roomId: roomId });

    res.json({ message: 'Request ignored' });
  } catch (error) {
    console.error('Ignore DM error:', error);
    res.status(500).json({ message: 'Server error ignoring DM' });
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

    // Validate ObjectId format
    if (!require('mongoose').Types.ObjectId.isValid(roomId)) {
      return res.status(400).json({ message: 'Invalid Room ID format' });
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

    // Validate ObjectId format
    if (!require('mongoose').Types.ObjectId.isValid(roomId)) {
      return res.status(400).json({ message: 'Invalid Room ID format' });
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

// Delete room (and all its messages)
exports.deleteRoom = async (req, res) => {
  try {
    const { roomId } = req.params;

    // Validate ObjectId format
    if (!require('mongoose').Types.ObjectId.isValid(roomId)) {
      return res.status(400).json({ message: 'Invalid Room ID format' });
    }

    const room = await Room.findById(roomId);

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Check authorization (only admin can delete)
    // Note: room.admin is usually an ObjectId, but if populated it might be an object
    const adminId = room.admin._id ? room.admin._id.toString() : room.admin.toString();
    if (adminId !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this room' });
    }

    // Delete all messages in the room
    const Message = require('../models/message-model');
    await Message.deleteMany({ roomId: roomId });

    // Delete the room
    await Room.findByIdAndDelete(roomId);

    res.json({ message: 'Room and all messages deleted successfully' });
  } catch (error) {
    console.error('Delete room error:', error);
    res.status(500).json({ message: 'Server error deleting room' });
  }
};
