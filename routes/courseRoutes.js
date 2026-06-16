const express = require('express');
const { check } = require('express-validator');
const { getCourses, createCourse, updateCourse, deleteCourse } = require('../controllers/courseController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validationMiddleware');

const router = express.Router();

router.get('/', getCourses);

router.post(
  '/',
  [
    protect,
    authorize('Admin'),
    check('title', 'Title is required').notEmpty(),
    check('description', 'Description is required').notEmpty(),
    check('category', 'Category is required').notEmpty(),
    check('difficulty', 'Difficulty is required and must be Beginner, Intermediate, or Advanced').isIn(['Beginner', 'Intermediate', 'Advanced']),
    check('duration', 'Duration is required').notEmpty(),
    validate,
  ],
  createCourse
);

router.put(
  '/:id',
  [
    protect,
    authorize('Admin'),
    check('difficulty', 'Difficulty must be Beginner, Intermediate, or Advanced').optional().isIn(['Beginner', 'Intermediate', 'Advanced']),
    validate,
  ],
  updateCourse
);

router.delete('/:id', protect, authorize('Admin'), deleteCourse);

module.exports = router;
