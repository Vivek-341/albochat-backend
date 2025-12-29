const User = require('../models/user-model');

// Send Friend Request
exports.sendRequest = async (req, res) => {
    try {
        const { targetUserId } = req.body;
        const currentUserId = req.user._id;

        if (targetUserId === currentUserId.toString()) {
            return res.status(400).json({ message: 'Cannot add yourself' });
        }

        const targetUser = await User.findById(targetUserId);
        const currentUser = await User.findById(currentUserId);

        if (!targetUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check if already friends
        if (currentUser.friends.some(id => id.toString() === targetUserId)) {
            return res.status(400).json({ message: 'Already friends' });
        }

        // Check if request already sent
        if (currentUser.sentFriendRequests.some(id => id.toString() === targetUserId)) {
            return res.status(400).json({ message: 'Request already sent' });
        }

        // Check if duplicate request (if target already sent request to current)
        if (targetUser.sentFriendRequests.some(id => id.toString() === currentUserId.toString())) {
            // Auto-accept scenario or just tell user to check their requests
            // For simplicity, let's just error
            return res.status(400).json({ message: 'This user already sent you a request' });
        }

        // Add to arrays
        currentUser.sentFriendRequests.push(targetUserId);
        targetUser.friendRequests.push(currentUserId);

        await currentUser.save();
        await targetUser.save();

        res.json({ message: 'Friend request sent' });
    } catch (error) {
        console.error('Send friend request error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Accept Friend Request
exports.acceptRequest = async (req, res) => {
    try {
        const { requesterId } = req.body;
        const currentUserId = req.user._id;

        const currentUser = await User.findById(currentUserId);
        const requester = await User.findById(requesterId);

        if (!requester) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (!currentUser.friendRequests.some(id => id.toString() === requesterId)) {
            return res.status(400).json({ message: 'No request found from this user' });
        }

        // Add to friends lists
        currentUser.friends.push(requesterId);
        requester.friends.push(currentUserId);

        // Remove from request lists
        currentUser.friendRequests = currentUser.friendRequests.filter(id => id.toString() !== requesterId);
        requester.sentFriendRequests = requester.sentFriendRequests.filter(id => id.toString() !== currentUserId.toString());

        await currentUser.save();
        await requester.save();

        res.json({ message: 'Friend request accepted' });
    } catch (error) {
        console.error('Accept friend request error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Reject Friend Request
exports.rejectRequest = async (req, res) => {
    try {
        const { requesterId } = req.params; // Using params for delete/reject
        const currentUserId = req.user._id;

        const currentUser = await User.findById(currentUserId);
        const requester = await User.findById(requesterId);

        if (!currentUser.friendRequests.some(id => id.toString() === requesterId)) {
            return res.status(400).json({ message: 'No request found from this user' });
        }

        // Remove from request lists
        currentUser.friendRequests = currentUser.friendRequests.filter(id => id.toString() !== requesterId);
        // requester might be null if deleted, but if exists remove from their sent list
        if (requester) {
            requester.sentFriendRequests = requester.sentFriendRequests.filter(id => id.toString() !== currentUserId.toString());
            await requester.save();
        }

        await currentUser.save();

        res.json({ message: 'Friend request rejected' });
    } catch (error) {
        console.error('Reject friend request error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get Friends
exports.getFriends = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).populate('friends', 'username email isOnline lastSeen');
        res.json(user.friends);
    } catch (error) {
        console.error('Get friends error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get Pending Requests (Incoming)
exports.getRequests = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).populate('friendRequests', 'username email');
        res.json(user.friendRequests);
    } catch (error) {
        console.error('Get requests error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Check Status (Is Friend / Request Sent / etc) - Helper for UI
exports.getFriendStatus = async (req, res) => {
    try {
        const { targetUserId } = req.params;
        const currentUserId = req.user._id;

        const user = await User.findById(currentUserId);

        let status = 'none'; // none, friend, sent, received

        if (user.friends.some(id => id.toString() === targetUserId)) {
            status = 'friend';
        } else if (user.sentFriendRequests.some(id => id.toString() === targetUserId)) {
            status = 'sent';
        } else if (user.friendRequests.some(id => id.toString() === targetUserId)) {
            status = 'received';
        }

        res.json({ status });
    } catch (error) {
        console.error('Get friend status error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}
