const { z } = require('zod');
const collaborationService = require('../services/collaborationService');

const commentSchema = z.object({
  content: z.string().min(1).max(5000),
});

const resolveApprovalSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  reason: z.string().max(1000).optional(),
});

async function addComment(req, res, next) {
  try {
    const data = commentSchema.parse(req.body);
    const comment = await collaborationService.addComment({
      workItemId: req.params.id,
      userId: req.user.id,
      content: data.content,
    });
    res.status(201).json(comment);
  } catch (err) {
    next(err);
  }
}

async function listComments(req, res, next) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const result = await collaborationService.listComments(req.params.id, { page, limit });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function getHistory(req, res, next) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const result = await collaborationService.getHistory(req.params.id, { page, limit });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function requestApproval(req, res, next) {
  try {
    const approval = await collaborationService.requestApproval({
      workItemId: req.params.id,
      requestedById: req.user.id,
    });
    res.status(201).json(approval);
  } catch (err) {
    next(err);
  }
}

async function resolveApproval(req, res, next) {
  try {
    const data = resolveApprovalSchema.parse(req.body);
    const approval = await collaborationService.resolveApproval({
      approvalId: req.params.approvalId,
      resolvedById: req.user.id,
      status: data.status,
      reason: data.reason,
    });
    res.json(approval);
  } catch (err) {
    next(err);
  }
}

module.exports = { addComment, listComments, getHistory, requestApproval, resolveApproval };
