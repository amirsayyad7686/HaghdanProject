const mongoose = require('mongoose');

const ContributionSchema = new mongoose.Schema({
    provider: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['Liquid Capital', 'Heavy Equipment', 'Real Estate/Facilities', 'Technical Leverage'], required: true },
    detail: { type: String, required: true },
    status: { type: String, enum: ['Unallocated', 'In Negotiation', 'Deployed'], default: 'Unallocated' }
});

module.exports = mongoose.model('Contribution', ContributionSchema);