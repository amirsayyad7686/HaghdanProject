const mongoose = require('mongoose');

// Simplified for Admin-Only Storytelling
const MilestoneSchema = new mongoose.Schema({
    stepNumber: { type: Number, required: true },
    description: { type: String, required: true },
    image: { type: String, default: '' } // URL to image
}, { timestamps: true });

const ProjectSchema = new mongoose.Schema({
    founder: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    backer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    title: { type: String, required: true },
    description: { type: String, required: true },
    needs: { type: String, required: true },
    status: { 
        type: String, 
        enum: ['Pending Review', 'Actively Seeking Assets', 'Fully Backed'], 
        default: 'Actively Seeking Assets' 
    },
    milestones: [MilestoneSchema]
}, { timestamps: true });

module.exports = mongoose.model('Project', ProjectSchema);