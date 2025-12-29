const User = require('../models/user-model');

// Search users by username
exports.searchUsers = async (req, res) => {
    try {
        const { query } = req.query;

        if (!query) {
            return res.status(400).json({ message: 'Search query is required' });
        }

        // Find users matching query (case-insensitive regex)
        // Exclude current user
        const users = await User.find({
            username: { $regex: query, $options: 'i' },
            _id: { $ne: req.user._id }
        })
            .select('_id username email isOnline') // Return only necessary fields
            .limit(10); // Limit results

        res.json(users);
    } catch (error) {
        console.error('Search users error:', error);
        res.status(500).json({ message: 'Server error searching users' });
    }
};
