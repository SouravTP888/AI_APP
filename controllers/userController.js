const User = require('../models/User');
const Course = require('../models/Course');
const LearningPath = require('../models/LearningPath');

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
const getUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    if (user) {
      res.json({
        success: true,
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        selectedTrack: user.selectedTrack,
        skillLevel: user.skillLevel,
      });
    } else {
      res.status(404);
      throw new Error('User not found');
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Update user profile (learning preferences / skill level)
// @route   PUT /api/users/profile
// @access  Private
const updateUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    if (user) {
      user.name = req.body.name || user.name;
      user.email = req.body.email || user.email;
      
      if (req.body.password) {
        user.password = req.body.password;
      }

      // Update preferences / track
      if (req.body.selectedTrack !== undefined) {
        user.selectedTrack = req.body.selectedTrack;
      }
      if (req.body.skillLevel !== undefined) {
        user.skillLevel = req.body.skillLevel;
      }

      const updatedUser = await user.save();

      // Trigger automatic learning path update if track or skill level was updated
      if (req.body.selectedTrack || req.body.skillLevel) {
        const trackKeyword = req.body.selectedTrack || user.selectedTrack;
        const levelKeyword = req.body.skillLevel || user.skillLevel;

        const query = {};
        if (trackKeyword) {
          query.$or = [
            { title: { $regex: trackKeyword, $options: 'i' } },
            { description: { $regex: trackKeyword, $options: 'i' } },
            { category: { $regex: trackKeyword, $options: 'i' } }
          ];
        }

        const matchingCourses = await Course.find(query);

        // Build Roadmap Stages
        const roadmapStages = [];
        if (matchingCourses.length > 0) {
          const beginnerCourses = matchingCourses.filter(c => c.difficulty === 'Beginner').map(c => c._id);
          const intermediateCourses = matchingCourses.filter(c => c.difficulty === 'Intermediate').map(c => c._id);
          const advancedCourses = matchingCourses.filter(c => c.difficulty === 'Advanced').map(c => c._id);

          if (beginnerCourses.length > 0) {
            roadmapStages.push({
              stageName: 'Stage 1: Foundations',
              status: 'unlocked', // First stage is unlocked
              courses: beginnerCourses
            });
          }
          if (intermediateCourses.length > 0) {
            roadmapStages.push({
              stageName: 'Stage 2: Core Mastery',
              status: beginnerCourses.length > 0 ? 'locked' : 'unlocked',
              courses: intermediateCourses
            });
          }
          if (advancedCourses.length > 0) {
            roadmapStages.push({
              stageName: 'Stage 3: Advanced Applications',
              status: (beginnerCourses.length > 0 || intermediateCourses.length > 0) ? 'locked' : 'unlocked',
              courses: advancedCourses
            });
          }

          if (roadmapStages.length === 0) {
            roadmapStages.push({
              stageName: 'General Roadmap',
              status: 'unlocked',
              courses: matchingCourses.map(c => c._id)
            });
          }
        }

        // Save/Update LearningPath
        await LearningPath.findOneAndUpdate(
          { userId: user._id },
          {
            recommendedCourses: matchingCourses.map(c => c._id),
            roadmapStages: roadmapStages
          },
          { upsert: true, returnDocument: 'after' }
        );
      }

      res.json({
        success: true,
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        selectedTrack: updatedUser.selectedTrack,
        skillLevel: updatedUser.skillLevel,
      });
    } else {
      res.status(404);
      throw new Error('User not found');
    }
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUserProfile,
  updateUserProfile,
};
