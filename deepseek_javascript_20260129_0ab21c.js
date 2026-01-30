const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const {
  getApplications,
  getApplication,
  createApplication,
  updateApplication,
  deleteApplication,
  updateApplicationStep,
  getDashboardStats,
  submitApplication
} = require('../controllers/application.controller');
const { protect, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

// Public routes for authenticated users
router.route('/')
  .get(getApplications)
  .post([
    check('type', 'Type is required').not().isEmpty(),
    check('amount', 'Amount is required').isNumeric(),
    check('currency', 'Currency is required').not().isEmpty(),
    check('expiryDate', 'Expiry date is required').isDate()
  ], createApplication);

router.route('/stats/dashboard')
  .get(getDashboardStats);

// Application ID routes
router.route('/:id')
  .get(getApplication)
  .put(updateApplication)
  .delete(authorize('user', 'admin'), deleteApplication);

router.route('/:id/step')
  .put(updateApplicationStep);

router.route('/:id/submit')
  .post(submitApplication);

// Admin and compliance officer routes
router.route('/admin/pending')
  .get(authorize('admin', 'compliance_officer'), getApplications);

module.exports = router;