const { ok, asyncHandler } = require('../utils/responses');
const { z } = require('zod');
const chatService = require('../services/chatThread.service');

const sendMessageBody = z.object({
    body: z.string().trim().min(1).max(2000),
}).strict();

exports.listThreads = asyncHandler(async (req, res) => {
    const threads = await chatService.listThreads(req.auth);
    return ok(res, threads);
});

exports.listMessages = asyncHandler(async (req, res) => {
    const before = req.query.before;
    const limit = req.query.limit ?? 50;
    const data = await chatService.getThreadMessages(req.auth, req.params.threadId, before, limit);
    return ok(res, data);
});

exports.sendMessage = asyncHandler(async (req, res) => {
    const payload = sendMessageBody.parse(req.body);
    const message = await chatService.sendMessage(req.auth, req.params.threadId, payload.body, req.app.locals.io);
    return ok(res, { message });
});

exports.markRead = asyncHandler(async (req, res) => {
    const result = await chatService.markThreadRead(req.auth, req.params.threadId, req.app.locals.io);
    return ok(res, result);
});
