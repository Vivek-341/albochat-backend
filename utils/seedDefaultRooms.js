// utils/seedDefaultRooms.js
const Room = require('../models/room-model');

const defaultRooms = [
    { name: 'general', description: 'General discussion for everyone' },
    { name: 'tech', description: 'Technology and programming discussions' },
    { name: 'fun', description: 'Fun and entertainment' },
    { name: 'random', description: 'Random topics and casual chat' },
    { name: 'announcements', description: 'Important announcements and updates' }
];

const seedDefaultRooms = async () => {
    try {
        // Check if default rooms already exist
        const existingDefaultRooms = await Room.countDocuments({ isDefault: true });

        if (existingDefaultRooms >= defaultRooms.length) {
            console.log('✅ Default public rooms already exist');
            return;
        }

        // Create default rooms
        for (const roomData of defaultRooms) {
            const existingRoom = await Room.findOne({
                name: roomData.name,
                isDefault: true
            });

            if (!existingRoom) {
                await Room.create({
                    name: roomData.name,
                    type: 'group',
                    isPublic: true,
                    isDefault: true,
                    members: [] // Empty initially, users join dynamically
                });
                console.log(`✅ Created default room: ${roomData.name}`);
            }
        }

        console.log('✅ Default public rooms seeded successfully');
    } catch (error) {
        console.error('❌ Error seeding default rooms:', error.message);
    }
};

module.exports = seedDefaultRooms;
