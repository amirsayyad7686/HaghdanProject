const express = require('express');
const router = express.Router();
const Deal = require('../models/Deal');
const Contribution = require('../models/Contribution');
const Project = require('../models/Project');
const { requireAuth } = require('../middleware/globalAuth');



// Deal Acceptance / Declining
router.post('/deals/:id/status', requireAuth, async (req, res) => {
    try {
        const { status } = req.body; 
        const deal = await Deal.findOneAndUpdate(
            { _id: req.params.id, receiver: req.session.userId }, 
            { status: status },
            { new: true }
        );
        
        if (status === 'Accepted') {
            if (deal.targetType === 'Project') {
                // Provider initiated the deal. Link Provider to the Project.
                await Project.findByIdAndUpdate(deal.targetId, { status: 'Fully Backed', backer: deal.sender });
            } else if (deal.targetType === 'Contribution') {
                // Entrepreneur initiated the deal. Find their newest project
                let project = await Project.findOneAndUpdate(
                    { founder: deal.sender }, 
                    { status: 'Fully Backed', backer: req.session.userId },
                    { sort: { createdAt: -1 }, new: true }
                );

                // ==========================================
                // NEW: Auto-create project if Entrepreneur forgot to make one!
                // ==========================================
                if (!project) {
                    await Project.create({
                        founder: deal.sender,
                        backer: req.session.userId,
                        title: 'پروژه مشترک و ادغام دارایی (سیستمی)',
                        description: 'این پروژه به صورت خودکار پس از تایید درخواست پشتیبانی ایجاد شده است تا داستان مراحل اجرایی در آن ثبت شود.',
                        needs: 'استفاده از دارایی‌های تامین‌کننده برای اجرای ایده.',
                        status: 'Fully Backed'
                    });
                }
            }
            req.flash('success', 'Contract Executed. Joint Venture is now active.');
        } else {
            req.flash('error', 'Request declined.');
        }
        res.redirect('/dashboard');
    } catch (err) {
        console.error(err);
        res.redirect('/dashboard');
    }
});


// Create New Deal Pitch
router.post('/deals', requireAuth, async (req, res) => {
    try {
        await Deal.create({
            sender: req.session.userId,
            receiver: req.body.receiverId,
            targetType: req.body.targetType,
            targetId: req.body.targetId,
            message: req.body.message
        });
        res.redirect('/dashboard');
    } catch (err) {
        res.status(500).send("Error initiating deal.");
    }
});

// Register New Asset
router.post('/contributions', requireAuth, async (req, res) => {
    try {
        await Contribution.create({
            provider: req.session.userId,
            type: req.body.type,
            detail: req.body.detail,
            status: 'Unallocated'
        });
        res.redirect('/contributions');
    } catch (err) {
        res.status(500).send("Error saving contribution.");
    }
});

// Draft New Project
router.post('/projects', requireAuth, async (req, res) => {
    try {
        await Project.create({
            founder: req.session.userId,
            title: req.body.title,
            description: req.body.description,
            needs: req.body.needs,
            status: 'Pending Review'
        });
        res.redirect('/projects');
    } catch (err) {
        res.status(500).send("Error saving project.");
    }
});





// ========================================================
// FILE UPLOAD CONFIGURATION (Multer)
// ========================================================
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, '../public/uploads/steps');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

// ========================================================
// ADMIN COMMANDS
// ========================================================

// 1. ADD NEW STEP (With Image Upload)
router.post('/admin/step', upload.single('image'), async (req, res) => {
    try {
        const project = await Project.findById(req.body.projectId);
        
        let imageUrl = '';
        if (req.file) imageUrl = '/uploads/steps/' + req.file.filename;

        project.milestones.push({
            stepNumber: req.body.stepNumber,
            description: req.body.description,
            image: imageUrl // Save uploaded file path
        });
        
        project.milestones.sort((a, b) => a.stepNumber - b.stepNumber);
        await project.save();
        res.redirect('/admin');
    } catch (err) {
        console.error(err);
        res.redirect('/admin');
    }
});

// 2. EDIT EXISTING STEP
router.post('/admin/projects/:id/step/:stepId/edit', upload.single('image'), async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);
        const step = project.milestones.id(req.params.stepId);
        
        step.stepNumber = req.body.stepNumber;
        step.description = req.body.description;
        if (req.file) step.image = '/uploads/steps/' + req.file.filename; // Only update image if a new one is uploaded
        
        project.milestones.sort((a, b) => a.stepNumber - b.stepNumber);
        await project.save();
        res.redirect('/admin');
    } catch (err) {
        console.error(err);
        res.redirect('/admin');
    }
});

// 3. DELETE STEP
router.post('/admin/projects/:id/step/:stepId/delete', async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);
        project.milestones.pull(req.params.stepId);
        await project.save();
        res.redirect('/admin');
    } catch (err) {
        console.error(err);
        res.redirect('/admin');
    }
});

// 4. DELETE ENTIRE PROJECT
router.post('/admin/projects/:id/delete', async (req, res) => {
    try {
        await Project.findByIdAndDelete(req.params.id);
        res.redirect('/admin');
    } catch (err) {
        console.error(err);
        res.redirect('/admin');
    }
});
module.exports = router;