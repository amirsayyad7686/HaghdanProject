const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }, 
    role: { type: String, enum: ['investor_provider', 'entrepreneur_builder'], required: true },
    company: { type: String, default: '' },
    bio: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);