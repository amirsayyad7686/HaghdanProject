const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
const path = require('path');
const bcrypt = require('bcryptjs');
const Deal = require('./models/Deal');
// 1. Import Database Models
const User = require('./models/User');
const Contribution = require('./models/Contribution');
const Project = require('./models/Project');
const flash = require('connect-flash');
// 2. Initialize Express Application
const app = express();

// 3. Connect to MongoDB
mongoose.connect('mongodb://127.0.0.1:27017/haghdan_project')
    .then(() => console.log('MongoDB Engine Online.'))
    .catch(err => console.error('MongoDB Connection Error:', err));

// ========================================================
// 4. GLOBAL REQUEST LOGGER (Your diagnostic tool)
// ========================================================
app.use((req, res, next) => {
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} Request to: ${req.url}`);
    next();
});

// 5. Global Middleware Configuration
app.use(express.urlencoded({ extended: true })); 
app.use(express.json());
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static('public'));

// ... scroll down to your Session Setup ...
app.use(session({
    secret: 'industrial_syndicate_secret_key', 
    resave: false,
    saveUninitialized: false
}));

// ADD THIS IMMEDIATELY AFTER YOUR SESSION SETUP
app.use(flash());

// UPDATE YOUR GLOBAL MIDDLEWARE to pass flash messages
app.use(async (req, res, next) => {
    res.locals.sessionUserId = req.session.userId || null; 
    res.locals.successMsg = req.flash('success'); // New line
    res.locals.errorMsg = req.flash('error');     // New line
    
    if (req.session.userId) {
        try {
            const currentUser = await User.findById(req.session.userId);
            res.locals.userRole = currentUser ? currentUser.role : null;
        } catch (err) {
            res.locals.userRole = null;
        }
    } else {
        res.locals.userRole = null;
    }
    next();
});


// 7. Custom Authentication Middleware
const requireAuth = (req, res, next) => {
    if (!req.session.userId) return res.redirect('/login');
    next();
};

// ========================================================
// 8. APPLICATION ROUTES
// ========================================================

// Landing Page
app.get('/', (req, res) => {
    res.render('index', { title: "HaghdanProject | Industrial Engine" });
});

// Authentication Pages
app.get('/register', (req, res) => res.render('register', { title: "Join the Syndicate" }));
app.get('/login', (req, res) => res.render('login', { title: "Workspace Access" }));

// Handle Registration Submission
app.post('/register', async (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        const hashedPassword = await bcrypt.hash(password, 12);
        
        await User.create({ name, email, password: hashedPassword, role });
        console.log(`New user registered: ${email}`);
        res.redirect('/login');
    } catch (err) {
        console.error("Registration Error:", err);
        res.status(400).send("Registration failed. Email might already exist.");
    }
});

// Handle Login Submission
app.post('/login', async (req, res) => {
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

// Logout Route
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// ========================================================
// REPLACED MATRIX ROUTE (Pagination & Filtering)
// ========================================================
app.get('/cooperate', async (req, res) => {
    try {
        const filter = req.query.filter || 'both'; 
        const page = parseInt(req.query.page) || 1;
        const limit = 5; // 5 items per page constraint
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

        res.render('cooperate', { 
            title: "Cooperation Matrix", 
            assets, projects, filter, currentPage: page, totalPages 
        });
    } catch (err) {
        console.error("Matrix Load Error:", err);
        res.status(500).send("Matrix offline.");
    }
});
// ========================================================
// UPGRADED DASHBOARD ROUTE (Inbox & Active Contracts)
// ========================================================
app.get('/dashboard', requireAuth, async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        
        const incomingDeals = await Deal.find({ receiver: req.session.userId, status: 'Pending' })
            .populate('sender', 'name email');

        const activeContracts = await Deal.find({
            $or: [{ sender: req.session.userId }, { receiver: req.session.userId }],
            status: 'Accepted'
        }).populate('sender', 'name email').populate('receiver', 'name email');

        // NEW LOGIC: Count actual items based on role
        let dynamicCount = 0;
        if (user.role === 'investor_provider') {
            dynamicCount = await Contribution.countDocuments({ provider: req.session.userId });
        } else {
            dynamicCount = await Project.countDocuments({ founder: req.session.userId });
        }

        res.render('dashboard', { 
            title: "Command Center", 
            user, 
            query: req.query, 
            deals: incomingDeals,
            contracts: activeContracts,
            itemCount: dynamicCount // Pass the count to EJS
        });
    } catch (error) {
        console.error("Dashboard Load Error:", error);
        res.redirect('/login');
    }
});
// ========================================================
// NEW ROUTE: HANDLE ACCEPT / DECLINE
// ========================================================
app.post('/api/deals/:id/status', requireAuth, async (req, res) => {
    try {
        const { status } = req.body; 
        await Deal.findOneAndUpdate(
            { _id: req.params.id, receiver: req.session.userId }, 
            { status: status }
        );
        
        // Trigger specific flash messages based on the action
        if (status === 'Accepted') {
            req.flash('success', 'Contract Executed. Communication lines are now open in the Vault.');
        } else {
            req.flash('error', 'Syndication request successfully declined and removed from inbox.');
        }
        
        res.redirect('/dashboard');
    } catch (err) {
        console.error(err);
        req.flash('error', 'System error updating deal status.');
        res.redirect('/dashboard');
    }
});
// ========================================================
// NEW ROUTE: HANDLE DEAL INITIATION
// ========================================================
app.post('/api/deals', requireAuth, async (req, res) => {
    try {
        await Deal.create({
            sender: req.session.userId,
            receiver: req.body.receiverId,
            targetType: req.body.targetType,
            targetId: req.body.targetId,
            message: req.body.message
        });
        console.log(`Deal initiated by user: ${req.session.userId}`);
        res.redirect('/dashboard');
    } catch (err) {
        console.error(err);
        res.status(500).send("Error initiating deal.");
    }
});

// The Cooperation Matrix
// The Live Cooperation Matrix
app.get('/cooperate', async (req, res) => {
    try {
        // Fetch only assets that haven't been claimed yet.
        // We use .populate() to grab the provider's name and email.
        const availableAssets = await Contribution.find({ status: 'Unallocated' })
            .populate('provider', 'name email');

        // Fetch projects that are still looking for backing.
        const activeProjects = await Project.find({ status: { $ne: 'Fully Backed' } })
            .populate('founder', 'name email');

        res.render('cooperate', { 
            title: "Cooperation Matrix | Live Matchmaking",
            assets: availableAssets,
            projects: activeProjects
        });
    } catch (err) {
        console.error("Matrix Load Error:", err);
        res.status(500).send("Matrix offline.");
    }
});

// ========================================================
// DATA INJECTION ROUTES (From the Dashboard)
// ========================================================

app.post('/api/contributions', requireAuth, async (req, res) => {
    try {
        await Contribution.create({
            provider: req.session.userId,
            type: req.body.type,
            detail: req.body.detail,
            status: 'Unallocated'
        });
        res.redirect('/contributions'); // Redirects to the ledger on success
    } catch (err) {
        console.error(err);
        res.status(500).send("Error saving contribution.");
    }
});

app.post('/api/projects', requireAuth, async (req, res) => {
    try {
        await Project.create({
            founder: req.session.userId,
            title: req.body.title,
            description: req.body.description,
            needs: req.body.needs,
            status: 'Pending Review'
        });
        res.redirect('/projects'); // Redirects to the pipeline on success
    } catch (err) {
        console.error(err);
        res.status(500).send("Error saving project.");
    }
});

// ========================================================
// 9. RESTORED CORE ROUTES (Now connected to MongoDB)
// ========================================================

// Contributions (Transparent Pool)
app.get('/contributions', async (req, res) => {
    try {
        // Fetch all contributions from MongoDB, and pull the Provider's name along with it
        const allContributions = await Contribution.find().populate('provider', 'name');
        
        // Dynamic Pagination Math
        const page = parseInt(req.query.page) || 1;
        const limit = 5; // Show 5 items per page
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;

        const paginatedContributions = allContributions.slice(startIndex, endIndex);
        const totalPages = Math.ceil(allContributions.length / limit) || 1; // Default to 1 if empty

        res.render('contributions', {
            title: "Transparent Contributions Hub",
            data: paginatedContributions,
            currentPage: page,
            totalPages: totalPages
        });
    } catch (err) {
        console.error("Error loading contributions:", err);
        res.status(500).send("Error loading contributions data.");
    }
});

// Projects & Ideas Needs
app.get('/projects', async (req, res) => {
    try {
        // Fetch projects from MongoDB, bringing in the founder's name
        const allProjects = await Project.find().populate('founder', 'name');
        
        res.render('projects', {
            title: "Project Proposals & Needs",
            projects: allProjects
        });
    } catch (err) {
        console.error("Error loading projects:", err);
        res.status(500).send("Error loading project data.");
    }
});

// ========================================================
// 10. SERVER INITIALIZATION
// ========================================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));