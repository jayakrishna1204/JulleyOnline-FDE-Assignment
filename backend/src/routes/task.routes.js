const express = require('express');
const {
  listTasks,
  getTask,
  createTask,
  updateTask,
  moveTask,
  deleteTask
} = require('../controllers/task.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requireTenant } = require('../middleware/tenant.middleware');

const router = express.Router();

router.use(authenticate);
router.use(requireTenant);

router.get('/', listTasks);
router.post('/', createTask);
router.get('/:id', getTask);
router.put('/:id', updateTask);
router.patch('/:id/move', moveTask);
router.delete('/:id', deleteTask);

module.exports = router;
