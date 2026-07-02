const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Contribution = require('../models/Contribution');
const Project = require('../models/Project');
const Deal = require('../models/Deal');
const { requireAuth } = require('../middleware/globalAuth');

// Language Switcher
// Language Switcher
router.get('/lang/:locale', (req, res) => {
    // 1. Set the language cookie
    res.cookie('lang', req.params.locale);
    
    // 2. Safely grab the previous URL, or default to home ('/') if missing
    const previousPage = req.get('Referer') || '/';
    
    // 3. Redirect
    res.redirect(previousPage);
});

// Home
router.get('/', (req, res) => {
    res.render('index', { title: "HaghdanProject | Industrial Engine" });
});

// Matrix
router.get('/cooperate', async (req, res) => {
    try {
        const filter = req.query.filter || 'both'; 
        const page = parseInt(req.query.page) || 1;
        const limit = 5;
        const skip = (page - 1) * limit;

        let assets = [], projects = [];
        let totalAssets = 0, totalProjects = 0;

        if (filter === 'both' || filter === 'assets') {
            assets = await Contribution.find({ status: 'Unallocated' })
                .populate('provider', 'name email').skip(skip).limit(limit);
            totalAssets = await Contribution.countDocuments({ status: 'Unallocated' });
        }
        
        if (filter === 'both' || filter === 'projects') {
            projects = await Project.find({ status: { $ne: 'Fully Backed' } })
                .populate('founder', 'name email').skip(skip).limit(limit);
            totalProjects = await Project.countDocuments({ status: { $ne: 'Fully Backed' } });
        }

        const maxTotal = filter === 'both' ? Math.max(totalAssets, totalProjects) : (filter === 'assets' ? totalAssets : totalProjects);
        const totalPages = Math.ceil(maxTotal / limit) || 1;

        res.render('cooperate', { title: "Cooperation Matrix", assets, projects, filter, currentPage: page, totalPages });
    } catch (err) {
        console.error("Matrix Load Error:", err);
        res.status(500).send("Matrix offline.");
    }
});

// Dashboard
router.get('/dashboard', requireAuth, async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        
        const incomingDeals = await Deal.find({ receiver: req.session.userId, status: 'Pending' })
            .populate('sender', 'name email');

// Inside your '/dashboard' route, update the Active Contracts fetch:
        const activeContracts = await Deal.find({
            $or: [{ sender: req.session.userId }, { receiver: req.session.userId }],
            status: 'Accepted'
        }).populate('sender', 'name email phone').populate('receiver', 'name email phone');

        let dynamicCount = 0;
        if (user.role === 'investor_provider') {
            dynamicCount = await Contribution.countDocuments({ provider: req.session.userId });
        } else {
            dynamicCount = await Project.countDocuments({ founder: req.session.userId });
        }

        res.render('dashboard', { title: "Command Center", user, query: req.query, deals: incomingDeals, contracts: activeContracts, itemCount: dynamicCount });
    } catch (error) {
        console.error("Dashboard Load Error:", error);
        res.redirect('/login');
    }
});

// Public Ledgers
router.get('/contributions', async (req, res) => {
    try {
        const allContributions = await Contribution.find().populate('provider', 'name');
        const page = parseInt(req.query.page) || 1;
        const limit = 5;
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;
        const paginatedContributions = allContributions.slice(startIndex, endIndex);
        const totalPages = Math.ceil(allContributions.length / limit) || 1;

        res.render('contributions', { title: "Transparent Contributions Hub", data: paginatedContributions, currentPage: page, totalPages: totalPages });
    } catch (err) {
        res.status(500).send("Error loading contributions data.");
    }
});

router.get('/projects', async (req, res) => {
    try {
        const allProjects = await Project.find().populate('founder', 'name');
        res.render('projects', { title: "Project Proposals & Needs", projects: allProjects });
    } catch (err) {
        res.status(500).send("Error loading project data.");
    }
});




// ONE-PAGE ADMIN PANEL (Static Route)
// ONE-PAGE ADMIN PANEL (Static Route)
router.get('/admin', async (req, res) => {
    try {
        // 1. Fetch ALL projects
        const allProjects = await Project.find()
            .populate('founder', 'name email phone')
            .populate('backer', 'name email phone');
            
        // 2. Fetch ALL users (This is what was missing!)
        const allUsers = await User.find().sort({ createdAt: -1 });
            
        // 3. Send BOTH projects and users to the admin page
        res.render('admin', { 
            title: "Admin Console", 
            projects: allProjects, 
            users: allUsers // <--- This fixes the crash
        });
    } catch (err) {
        console.error("Admin Route Error:", err);
        res.status(500).send("Admin offline.");
    }
});
module.exports = router;