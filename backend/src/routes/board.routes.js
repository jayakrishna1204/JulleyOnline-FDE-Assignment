const express = require('express');
const {
  listBoards,
  getBoard,
  createBoard,
  updateBoard,
  deleteBoard
} = require('../controllers/board.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requireTenant } = require('../middleware/tenant.middleware');

const router = express.Router();

router.use(authenticate);
router.use(requireTenant);

router.get('/', listBoards);
router.post('/', createBoard);
router.get('/:id', getBoard);
router.put('/:id', updateBoard);
router.delete('/:id', deleteBoard);

module.exports = router;
