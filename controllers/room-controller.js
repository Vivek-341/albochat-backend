const Room = require('../models/room.model');

exports.createDMRoom = async (req, res) => {
  const { userId } = req.body;

  let room = await Room.findOne({
    type: 'dm',
    members: { $all: [req.user._id, userId], $size: 2 }
  });

  if (!room) {
    room = await Room.create({
      type: 'dm',
      members: [req.user._id, userId]
    });
  }

  res.json(room);
};

exports.createGroupRoom = async (req, res) => {
  const { name, members } = req.body;

  const room = await Room.create({
    name,
    type: 'group',
    members,
    admin: req.user._id
  });

  res.json(room);
};

exports.getUserRooms = async (req, res) => {
  const rooms = await Room.find({ members: req.user._id });
  res.json(rooms);
};
