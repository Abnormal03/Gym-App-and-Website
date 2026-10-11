const express = require('express');
const { requireRole } = require('../middleware/auth.middleware');
const ctrl = require('../controllers/payout.controller');

const router = express.Router();

const providerRoles = requireRole('TRAINER', 'PHYSIOTHERAPIST', 'NUTRITION_CONSULTANT');
const adminOnly = requireRole('GYM_ADMIN');

// Provider earnings and payout requests (E-45, E-46, E-47)
router.get('/me/earnings', ...providerRoles, ctrl.getMyEarnings);
router.post('/me/payouts', ...providerRoles, ctrl.requestPayout);
router.get('/me/payouts', ...providerRoles, ctrl.getMyPayouts);

// Gym Admin payout management (E-62, E-63, E-64)
router.get('/admin/payouts', ...adminOnly, ctrl.getAdminPayouts);
router.post('/admin/payouts/:id/mark-paid', ...adminOnly, ctrl.markPayoutPaid);
router.post('/admin/payouts/:id/reject', ...adminOnly, ctrl.rejectPayout);

module.exports = router;
