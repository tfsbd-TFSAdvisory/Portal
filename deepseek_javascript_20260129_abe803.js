const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const {
  register,
  login,
  logout,
  forgotPassword,
  resetPassword
} = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth');

router.post('/register', [
  check('firstName', 'First name is required').not().isEmpty(),
  check('lastName', 'Last name is required').not().isEmpty(),
  check('email', 'Please include a valid email').isEmail(),
  check('password', 'Please enter a password with 6 or more characters').isLength({ min: 6 })
], register);

router.post('/login', [
  check('email', 'Please include a valid email').isEmail(),
  check('password', 'Password is required').exists()
], login);

router.post('/logout', protect, logout);

router.post('/forgot-password', [
  check('email', 'Please include a valid email').isEmail()
], forgotPassword);

router.post('/reset-password/:token', [
  check('password', 'Please enter a password with 6 or more characters').isLength({ min: 6 })
], resetPassword);

module.exports = router;