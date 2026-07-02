const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');

router.get('/register', (req, res) => res.render('register', { title: "Join the Syndicate" }));
router.get('/login', (req, res) => res.render('login', { title: "Workspace Access" }));

router.post('/register', async (req, res) => {
    try {
        // Extract phone alongside the rest
        const { name, email, phone, password, role } = req.body; 
        const hashedPassword = await bcrypt.hash(password, 12);
        
        // Save phone to DB
        await User.create({ name, email, phone, password: hashedPassword, role }); 
        
        console.log(`New user registered: ${email}`);
        res.redirect('/login');
    } catch (err) {
        console.error("Registration Error:", err);
        res.status(400).send("Registration failed. Email might already exist.");
    }
});

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        
        if (user && await bcrypt.compare(password, user.password)) {
            req.session.userId = user._id;
            console.log(`User logged in: ${email}`);
            res.redirect('/dashboard');
        } else {
            res.status(401).send("Invalid credentials.");
        }
    } catch (err) {
        console.error("Login Error:", err);
        res.redirect('/login');
    }
});

router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

module.exports = router;