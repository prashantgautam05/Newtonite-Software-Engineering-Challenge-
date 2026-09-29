const express = require('express');
const router = express.Router();
const teamController = require('../controllers/teamController');
const { authenticate } = require('../middleware/auth');
const { idempotency } = require('../middleware/idempotency');

// All routes require authentication
router.use(authenticate);

// Teams CRUD
router.get('/', teamController.list);
router.post('/', idempotency(), teamController.create);
router.get('/:id', teamController.getById);

// Team members
router.post('/:id/members', idempotency(), teamController.addMember);
router.delete('/:id/members/:userId', teamController.removeMember);

// Users list (for assignment dropdowns)
router.get('/users/all', teamController.listUsers);

module.exports = router;
