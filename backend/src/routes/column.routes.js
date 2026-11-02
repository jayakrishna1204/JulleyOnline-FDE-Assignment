const express = require('express');
const {
  getBoardColumns,
  createColumn,
  updateColumn,
  deleteColumn
} = require('../controllers/column.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requireTenant } = require('../middleware/tenant.middleware');

const router = express.Router();

router.use(authenticate);
router.use(requireTenant);

router.get('/board/:boardId', getBoardColumns);
router.post('/', createColumn);
router.put('/:id', updateColumn);
router.delete('/:id', deleteColumn);

module.exports = router;
