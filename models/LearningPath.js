const mongoose = require('mongoose');

const roadmapStageSchema = new mongoose.Schema({
  stageName: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['locked', 'unlocked', 'completed'],
    default: 'locked',
  },
  courses: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
  }],
});

const learningPathSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  recommendedCourses: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
  }],
  roadmapStages: [roadmapStageSchema],
}, {
  timestamps: true,
});

module.exports = mongoose.model('LearningPath', learningPathSchema);
