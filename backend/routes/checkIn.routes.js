const express = require('express');
const { requireRole } = require('../middleware/auth.middleware');
const ctrl = require('../controllers/checkIn.controller');

const router = express.Router();

const staffAndAdmin = requireRole('GYM_STAFF', 'GYM_ADMIN');
const memberOnly = requireRole('MEMBER');
const allUsers = requireRole('MEMBER', 'TRAINER', 'PHYSIOTHERAPIST', 'NUTRITION_CONSULTANT');

// Member pass and stats
router.get('/me/pass', ...memberOnly, ctrl.getPass);
router.get('/me/stats', ...memberOnly, ctrl.getStats);
router.get('/me/badges', ...allUsers, ctrl.getBadges);

// Staff / Admin check-in operations
router.post('/checkins/scan', ...staffAndAdmin, ctrl.scan);
router.post('/checkins/manual', ...staffAndAdmin, ctrl.manual);
router.get('/checkins/today', ...staffAndAdmin, ctrl.today);
router.get('/staff/members', ...staffAndAdmin, ctrl.searchMembers);

module.exports = router;
