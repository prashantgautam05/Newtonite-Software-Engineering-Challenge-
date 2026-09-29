const { z } = require('zod');
const workItemService = require('../services/workItemService');

const createSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(10000).optional(),
  priority: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']).optional(),
  category: z.enum(['CUSTOMER_ISSUE', 'INCIDENT', 'COMPLIANCE', 'PAYMENT', 'OPERATIONAL', 'OTHER']).optional(),
  teamId: z.string().uuid(),
  assigneeId: z.string().uuid().optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
});

const updateSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(10000).optional().nullable(),
  status: z.enum(['OPEN', 'IN_PROGRESS', 'AWAITING_APPROVAL', 'RESOLVED', 'CLOSED']).optional(),
  priority: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']).optional(),
  category: z.enum(['CUSTOMER_ISSUE', 'INCIDENT', 'COMPLIANCE', 'PAYMENT', 'OPERATIONAL', 'OTHER']).optional(),
  assigneeId: z.string().uuid().optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
  version: z.number().int().min(1),
});

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['OPEN', 'IN_PROGRESS', 'AWAITING_APPROVAL', 'RESOLVED', 'CLOSED']).optional(),
  priority: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']).optional(),
  category: z.enum(['CUSTOMER_ISSUE', 'INCIDENT', 'COMPLIANCE', 'PAYMENT', 'OPERATIONAL', 'OTHER']).optional(),
  assigneeId: z.string().uuid().optional(),
  teamId: z.string().uuid().optional(),
  search: z.string().max(200).optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'priority', 'status', 'dueDate', 'title']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

async function create(req, res, next) {
  try {
    const data = createSchema.parse(req.body);
    const item = await workItemService.createWorkItem({
      ...data,
      reporterId: req.user.id,
    });
    res.status(201).json(item);
  } catch (err) {
    next(err);
  }
}

async function list(req, res, next) {
  try {
    const query = listQuerySchema.parse(req.query);
    const result = await workItemService.listWorkItems({
      ...query,
      userId: req.user.id,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const item = await workItemService.getWorkItem(req.params.id);
    res.json(item);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const data = updateSchema.parse(req.body);
    const item = await workItemService.updateWorkItem(
      req.params.id,
      data,
      req.user.id
    );
    res.json(item);
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await workItemService.deleteWorkItem(req.params.id, req.user.id);
    res.json({ message: 'Work item deleted' });
  } catch (err) {
    next(err);
  }
}

async function assign(req, res, next) {
  try {
    const { assigneeId } = req.body;
    const item = await workItemService.assignWorkItem(
      req.params.id,
      assigneeId,
      req.user.id
    );
    res.json(item);
  } catch (err) {
    next(err);
  }
}

async function dashboard(req, res, next) {
  try {
    const stats = await workItemService.getDashboardStats(req.user.id);
    res.json(stats);
  } catch (err) {
    next(err);
  }
}

module.exports = { create, list, getById, update, remove, assign, dashboard };
