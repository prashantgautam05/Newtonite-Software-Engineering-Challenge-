const express = require('express');
const router = express.Router();
const workItemController = require('../controllers/workItemController');
const collaborationController = require('../controllers/collaborationController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { idempotency } = require('../middleware/idempotency');

// All routes require authentication
router.use(authenticate);

// Dashboard
router.get('/dashboard', workItemController.dashboard);

// Work Items CRUD
router.post('/', idempotency(), authorize(['ADMIN', 'MEMBER']), workItemController.create);
router.get('/', workItemController.list);
router.get('/:id', workItemController.getById);
router.put('/:id', idempotency(), authorize(['ADMIN', 'MEMBER']), workItemController.update);
router.delete('/:id', authorize(['ADMIN']), workItemController.remove);

// Assignment
router.post('/:id/assign', idempotency(), authorize(['ADMIN', 'MEMBER']), workItemController.assign);

// Comments
router.post('/:id/comments', authorize(['ADMIN', 'MEMBER']), collaborationController.addComment);
router.get('/:id/comments', collaborationController.listComments);

// History
router.get('/:id/history', collaborationController.getHistory);

// Approvals
router.post('/:id/approvals', idempotency(), authorize(['ADMIN', 'MEMBER']), collaborationController.requestApproval);
router.put('/approvals/:approvalId', idempotency(), collaborationController.resolveApproval);

module.exports = router;
