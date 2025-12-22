const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

const socketAuth = async (socket, next) => {
  try {
    // Token sent from frontend while connecting socket
    const token = socket.handshake.auth?.token;

    if (!token) {
      return next(new Error('Authentication token missing'));
    }

    // Verify JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find user
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return next(new Error('User not found'));
    }

    // Attach user to socket
    socket.user = user;
    socket.userId = user._id.toString();

    next(); // allow connection
  } catch (err) {
    next(new Error('Invalid or expired token'));
  }
};

module.exports = socketAuth;
