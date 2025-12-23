const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
    {
        group: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Group',
            required: true,
        },
        sender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        content: {
            type: String,
            required: [true, 'Message content cannot be empty'],
            trim: true,
        },
        attachment: {
            type: String, // URL to file
        },
        reactions: [{
            user: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
            },
            emoji: String,
            name: String, // Storing name for easier display
        }],
        isReadBy: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        }],
    },
    {
        timestamps: true,
    }
);

// Index for group history retrieval
messageSchema.index({ group: 1, createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);
