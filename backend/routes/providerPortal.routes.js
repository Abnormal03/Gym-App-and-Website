const express = require('express');
const { requireRole } = require('../middleware/auth.middleware');
const profile = require('../controllers/providerProfile.controller');
const availability = require('../controllers/providerAvailability.controller');
const packages = require('../controllers/providerPackage.controller');
const clients = require('../controllers/providerClient.controller');
const consultationPlan = require('../controllers/consultationPlan.controller');

const router = express.Router();
const providerRoles = ['TRAINER', 'PHYSIOTHERAPIST', 'NUTRITION_CONSULTANT'];
const bookableProviderRoles = ['TRAINER', 'PHYSIOTHERAPIST'];
const consultantRoles = ['NUTRITION_CONSULTANT'];

router.get('/me/provider', ...requireRole(...providerRoles), profile.get);
router.put('/me/provider', ...requireRole(...providerRoles), profile.update);

router.get('/me/availability', ...requireRole(...bookableProviderRoles), availability.get);
router.put('/me/availability', ...requireRole(...bookableProviderRoles), availability.replace);

router.post('/me/packages', ...requireRole(...bookableProviderRoles), packages.create);
router.get('/me/packages', ...requireRole(...bookableProviderRoles), packages.list);
router.get('/me/packages/:id', ...requireRole(...bookableProviderRoles), packages.get);
router.patch('/me/packages/:id', ...requireRole(...bookableProviderRoles), packages.update);
router.delete('/me/packages/:id', ...requireRole(...bookableProviderRoles), packages.deactivate);

router.get('/me/clients', ...requireRole(...providerRoles), clients.list);

// Nutrition consultants set their price and chat days; null resets either to platform defaults.
// PUT { consultationPrice?: number|null, chatDays?: number|null }.
router.get('/me/consultation-plan', ...requireRole(...consultantRoles), consultationPlan.get);
router.put('/me/consultation-plan', ...requireRole(...consultantRoles), consultationPlan.update);

module.exports = router;
