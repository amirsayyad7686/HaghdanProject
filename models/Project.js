const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema({
    // Links this project to the specific entrepreneur who created it
    founder: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    title: { 
        type: String, 
        required: true 
    },
    description: { 
        type: String, 
        required: true 
    },
    needs: { 
        type: String, 
        required: true 
    }, // E.g., "Requires CNC Machining Facility"
    status: { 
        type: String, 
        enum: ['Pending Review', 'Actively Seeking Assets', 'Fully Backed'], 
        default: 'Pending Review' 
    }
}, { timestamps: true });

module.exports = mongoose.model('Project', ProjectSchema);