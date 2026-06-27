const mongoose = require('mongoose');

const DealSchema = new mongoose.Schema({
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    targetType: { type: String, enum: ['Project', 'Contribution'], required: true },
    targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
    message: { type: String, required: true },
    status: { type: String, enum: ['Pending', 'Accepted', 'Declined'], default: 'Pending' }
}, { timestamps: true });

module.exports = mongoose.model('Deal', DealSchema);