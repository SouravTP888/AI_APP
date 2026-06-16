const express = require('express');
const { check } = require('express-validator');
const { getProgressByUserId, updateProgress } = require('../controllers/progressController');
const { protect } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validationMiddleware');

const router = express.Router();

router.get('/:userId', protect, getProgressByUserId);

router.put(
  '/update',
  [
    protect,
    check('courseId', 'Course ID is required and must be a valid MongoDB ID').notEmpty().isMongoId(),
    check('lessonId', 'Lesson ID is required').notEmpty(),
    check('completed', 'Completed must be a boolean').optional().isBoolean(),
    validate,
  ],
  updateProgress
);

module.exports = router;
