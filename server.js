const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
const path = require('path');
const flash = require('connect-flash');
const i18n = require('i18n');
const cookieParser = require('cookie-parser');

// 1. Import Middlewares & Routes
const { setGlobals } = require('./middleware/globalAuth');
const authRoutes = require('./routes/authRoutes');
const viewRoutes = require('./routes/viewRoutes');
const apiRoutes = require('./routes/apiRoutes');

const app = express();
////mongodb://haghdan_user:Haghdan_SecurePassword_2026!@127.0.0.1:27017/haghdan_db?authSource=haghdan_db


// 2. Connect to MongoDB
mongoose.connect('mongodb://haghdan_user:Haghdan_SecurePassword_2026!@127.0.0.1:27017/haghdan_db?authSource=haghdan_db')
    .then(() => console.log('MongoDB Engine Online.'))
    .catch(err => console.error('MongoDB Connection Error:', err));

// 3. System Configuration
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static('public'));

// 4. Cookies, Sessions, and Flash
app.use(cookieParser());
app.use(session({
    secret: 'industrial_syndicate_secret_key', 
    resave: false,
    saveUninitialized: false
}));
app.use(flash());
// ==========================================
// NEW: FORCED DEFAULT LANGUAGE MIDDLEWARE
// ==========================================
app.use((req, res, next) => {
    // If the user has no language cookie, strictly force Persian
    if (!req.cookies.lang) {
        req.cookies.lang = 'fa'; // Tell i18n to use 'fa' for this load
        res.cookie('lang', 'fa'); // Save it to the browser for their next click
    }
    next();
});
// 5. Language Engine Setup (i18n)
i18n.configure({
    locales: ['en', 'fa'],
    directory: path.join(__dirname, 'locales'),
    defaultLocale: 'fa',
    cookie: 'lang'
});
app.use(i18n.init);

// 6. Global Middlewares
app.use((req, res, next) => {
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} Request to: ${req.url}`);
    next();
});
app.use(setGlobals); // Loads roles, languages, and flash messages

// 7. Mount Routers
app.use('/', authRoutes);      // Registers /login, /register, /logout
app.use('/', viewRoutes);      // Registers /dashboard, /projects, /cooperate, etc.
app.use('/api', apiRoutes);    // Registers all /api/... actions

// 8. Launch Engine
const PORT = 8012;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));