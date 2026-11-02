const express = require('express');
const {
  listTenants,
  getTenant,
  createTenant,
  updateTenant,
  deleteTenant,
  getTenantUsers
} = require('../controllers/tenant.controller');
const { authenticate } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(authenticate);

router.get('/', listTenants);
router.post('/', createTenant);
router.get('/:id', getTenant);
router.put('/:id', updateTenant);
router.delete('/:id', deleteTenant);
router.get('/:id/users', getTenantUsers);

module.exports = router;
