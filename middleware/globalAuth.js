const User = require('../models/User');

// Global Variables Middleware
const setGlobals = async (req, res, next) => {
    res.locals.lang = req.cookies.lang || 'fa'; 
    res.locals.__ = res.__; 
    
    // Safely check session to prevent crashes
    res.locals.sessionUserId = req.session ? req.session.userId : null; 
    res.locals.successMsg = req.flash('success');
    res.locals.errorMsg = req.flash('error');    
    
    if (req.session && req.session.userId) {
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
};

// Route Protection Middleware
const requireAuth = (req, res, next) => {
    if (!req.session || !req.session.userId) return res.redirect('/login');
    next();
};

module.exports = { setGlobals, requireAuth };