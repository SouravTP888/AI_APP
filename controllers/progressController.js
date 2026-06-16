const Progress = require('../models/Progress');
const Course = require('../models/Course');

// @desc    Get progress for a user
// @route   GET /api/progress/:userId
// @access  Private
const getProgressByUserId = async (req, res, next) => {
  try {
    // Check authorization: users can view their own progress, or Admins can view anyone's
    if (req.user.role !== 'Admin' && req.user.id !== req.params.userId) {
      res.status(403);
      throw new Error('Not authorized to view this progress record');
    }

    const progress = await Progress.find({ userId: req.params.userId }).populate('courseId', 'title description difficulty category duration');
    res.json({ success: true, count: progress.length, data: progress });
  } catch (error) {
    next(error);
  }
};

// @desc    Update progress for a user's course
// @route   PUT /api/progress/update
// @access  Private
const updateProgress = async (req, res, next) => {
  try {
    const { courseId, lessonId, completed } = req.body;
    // By default, update the progress of the logged in user, unless admin specifies another userId
    const targetUserId = (req.user.role === 'Admin' && req.body.userId) ? req.body.userId : req.user.id;

    if (!courseId || !lessonId) {
      res.status(400);
      throw new Error('Please provide courseId and lessonId');
    }

    // Find course to get total lessons
    const course = await Course.findById(courseId);
    if (!course) {
      res.status(404);
      throw new Error(`Course not found with id of ${courseId}`);
    }

    // Extract all lesson IDs from course modules
    let totalLessons = 0;
    const allLessonIds = [];
    course.modules.forEach(module => {
      module.lessons.forEach(lesson => {
        allLessonIds.push(lesson.id);
        totalLessons++;
      });
    });

    if (totalLessons === 0) {
      res.status(400);
      throw new Error('This course does not contain any lessons');
    }

    // Find or create progress record
    let progress = await Progress.findOne({ userId: targetUserId, courseId });
    if (!progress) {
      progress = new Progress({
        userId: targetUserId,
        courseId,
        completedLessons: [],
        completionPercentage: 0,
        status: 'not-started',
      });
    }

    // Update completedLessons list
    const isCompleted = completed === undefined ? true : !!completed;
    const lessonIndex = progress.completedLessons.indexOf(lessonId);

    if (isCompleted) {
      if (lessonIndex === -1) {
        progress.completedLessons.push(lessonId);
      }
    } else {
      if (lessonIndex !== -1) {
        progress.completedLessons.splice(lessonIndex, 1);
      }
    }

    // Filter out completed lessons that are not part of the course anymore
    progress.completedLessons = progress.completedLessons.filter(id => allLessonIds.includes(id));

    // Calculate percentage
    const completedCount = progress.completedLessons.length;
    progress.completionPercentage = Math.round((completedCount / totalLessons) * 100);

    // Update status
    if (progress.completionPercentage === 100) {
      progress.status = 'completed';
    } else if (progress.completionPercentage > 0) {
      progress.status = 'in-progress';
    } else {
      progress.status = 'not-started';
    }

    await progress.save();

    res.json({ success: true, data: progress });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProgressByUserId,
  updateProgress,
};
