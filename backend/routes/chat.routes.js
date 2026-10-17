const express = require('express');
const { requireRole } = require('../middleware/auth.middleware');
const chatController = require('../controllers/chat.controller');

const router = express.Router();
const chatRoles = ['MEMBER', 'TRAINER', 'PHYSIOTHERAPIST', 'NUTRITION_CONSULTANT'];

router.get('/', ...requireRole(...chatRoles), chatController.listThreads);
router.get('/:threadId/messages', ...requireRole(...chatRoles), chatController.listMessages);
router.post('/:threadId/messages', ...requireRole(...chatRoles), chatController.sendMessage);
router.patch('/:threadId/messages/:messageId', ...requireRole(...chatRoles), chatController.editMessage);
router.delete('/:threadId/messages/:messageId', ...requireRole(...chatRoles), chatController.deleteMessage);
router.post('/:threadId/read', ...requireRole(...chatRoles), chatController.markRead);

module.exports = router;
