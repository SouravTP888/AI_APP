const mongoose = require('mongoose');

const lessonSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
  },
  title: {
    type: String,
    required: [true, 'Please add a lesson title'],
  },
  content: {
    type: String,
    default: '',
  },
});

const moduleSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add a module title'],
  },
  lessons: [lessonSchema],
});

const courseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add a course title'],
    trim: true,
  },
  description: {
    type: String,
    required: [true, 'Please add a course description'],
  },
  category: {
    type: String,
    required: [true, 'Please add a course category'],
  },
  difficulty: {
    type: String,
    required: [true, 'Please add a course difficulty level'],
    enum: ['Beginner', 'Intermediate', 'Advanced'],
  },
  duration: {
    type: String,
    required: [true, 'Please add a course duration'],
  },
  modules: [moduleSchema],
}, {
  timestamps: true,
});

module.exports = mongoose.model('Course', courseSchema);
