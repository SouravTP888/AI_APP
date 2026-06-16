const express = require('express');
const { check } = require('express-validator');
const { getUserProfile, updateUserProfile } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validationMiddleware');

const router = express.Router();

router.get('/profile', protect, getUserProfile);

router.put(
  '/profile',
  [
    protect,
    check('email', 'Please include a valid email').optional().isEmail(),
    check('skillLevel', 'Skill level must be Beginner, Intermediate, or Advanced').optional().isIn(['Beginner', 'Intermediate', 'Advanced', '']),
    validate,
  ],
  updateUserProfile
);

module.exports = router;
