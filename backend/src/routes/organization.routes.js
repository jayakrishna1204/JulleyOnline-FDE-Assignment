const express = require('express');
const {
  listOrganizations,
  getOrganization,
  createOrganization,
  updateOrganization,
  deleteOrganization
} = require('../controllers/organization.controller');
const { authenticate } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(authenticate);

router.get('/', listOrganizations);
router.post('/', createOrganization);
router.get('/:id', getOrganization);
router.put('/:id', updateOrganization);
router.delete('/:id', deleteOrganization);

module.exports = router;
