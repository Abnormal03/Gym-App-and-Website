const express = require('express');
const { GetGyms, getGymDetails, addGym, updateGym, checkAvailability } = require('../controllers/gym.controller');
const { protect, adminOnly } = require('../middleware/auth.middleware');

const router = express.Router();

router.get('/', protect, GetGyms);

router.get('/:id', protect, getGymDetails);

router.get('/:id/avalability', protect, checkAvailability);

router.post('/', protect, adminOnly, addGym)

router.put('/:id', protect, adminOnly, updateGym);

module.exports = router;