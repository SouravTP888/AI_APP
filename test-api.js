const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Load env variables
dotenv.config();

let mongoServer;

async function runTests() {
  console.log('--- Starting LMS Automation Engine Integration Tests ---');
  
  // Start in-memory MongoDB server
  console.log('Starting in-memory MongoDB server...');
  try {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    console.log(`In-memory MongoDB started at: ${mongoUri}`);
    
    // Override MONGO_URI env variable before loading the app
    process.env.MONGO_URI = mongoUri;
  } catch (err) {
    console.error('Failed to start in-memory MongoDB:', err.message);
    process.exit(1);
  }

  // Require server.js to start the server and database connection
  const app = require('./server');

  const PORT = process.env.PORT || 5000;
  const BASE_URL = `http://127.0.0.1:${PORT}`;

  // Import Models for database verification and cleanup
  const User = require('./models/User');
  const Course = require('./models/Course');
  const Progress = require('./models/Progress');
  const LearningPath = require('./models/LearningPath');

  // Wait to ensure database connection is established
  await new Promise((resolve) => setTimeout(resolve, 2000));

  let studentToken = '';
  let adminToken = '';
  let studentId = '';
  let adminId = '';
  let testCourseId = '';

  const testStudentEmail = `student_${Date.now()}@test.com`;
  const testAdminEmail = `admin_${Date.now()}@test.com`;
  const testPassword = 'password123';

  try {
    // 1. REGISTER STUDENT
    console.log('\n[TEST 1] Registering a Student...');
    const registerStudentRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Student',
        email: testStudentEmail,
        password: testPassword,
        role: 'Student',
      }),
    });
    const registerStudentData = await registerStudentRes.json();
    
    if (registerStudentRes.status === 201 && registerStudentData.success) {
      console.log('  -> PASS: Student registered successfully');
      studentId = registerStudentData._id;
      studentToken = registerStudentData.token;
    } else {
      throw new Error(`FAIL: Student registration failed: ${JSON.stringify(registerStudentData)}`);
    }

    // 2. REGISTER ADMIN
    console.log('\n[TEST 2] Registering an Admin...');
    const registerAdminRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Admin',
        email: testAdminEmail,
        password: testPassword,
        role: 'Admin',
      }),
    });
    const registerAdminData = await registerAdminRes.json();
    
    if (registerAdminRes.status === 201 && registerAdminData.success) {
      console.log('  -> PASS: Admin registered successfully');
      adminId = registerAdminData._id;
      adminToken = registerAdminData.token;
    } else {
      throw new Error(`FAIL: Admin registration failed: ${JSON.stringify(registerAdminData)}`);
    }

    // 3. LOGIN STUDENT
    console.log('\n[TEST 3] Logging in Student...');
    const loginStudentRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testStudentEmail,
        password: testPassword,
      }),
    });
    const loginStudentData = await loginStudentRes.json();
    
    if (loginStudentRes.status === 200 && loginStudentData.success) {
      console.log('  -> PASS: Student login successful');
    } else {
      throw new Error(`FAIL: Student login failed: ${JSON.stringify(loginStudentData)}`);
    }

    // 4. CREATE COURSE (AS STUDENT - SHOULD FAIL with 403)
    console.log('\n[TEST 4] Creating Course as Student (Should fail with 403)...');
    const createCourseStudentRes = await fetch(`${BASE_URL}/api/courses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        title: 'Test Course (Student)',
        description: 'Should not allow creation',
        category: 'Main Course',
        difficulty: 'Beginner',
        duration: '1 week',
      }),
    });
    const createCourseStudentData = await createCourseStudentRes.json();
    
    if (createCourseStudentRes.status === 403 && !createCourseStudentData.success) {
      console.log('  -> PASS: Correctly blocked Student course creation');
    } else {
      throw new Error(`FAIL: Course creation by Student was not blocked: status ${createCourseStudentRes.status}`);
    }

    // 5. CREATE COURSE (AS ADMIN - SHOULD SUCCEED)
    console.log('\n[TEST 5] Creating Course as Admin...');
    const testCoursePayload = {
      title: 'Test Course: AI Software Dev Basics',
      description: 'An introductory course for AI development.',
      category: 'AI Software Dev',
      difficulty: 'Beginner',
      duration: '4 weeks',
      modules: [
        {
          title: 'Module 1: Introduction to AI',
          lessons: [
            { id: 'lesson-1', title: 'What is AI?', content: 'AI stands for Artificial Intelligence.' },
            { id: 'lesson-2', title: 'History of LLMs', content: 'Brief history of large language models.' }
          ]
        },
        {
          title: 'Module 2: Advanced Agents',
          lessons: [
            { id: 'lesson-3', title: 'Agentic Workflows', content: 'How agentic systems interact.' }
          ]
        }
      ]
    };

    const createCourseAdminRes = await fetch(`${BASE_URL}/api/courses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify(testCoursePayload),
    });
    const createCourseAdminData = await createCourseAdminRes.json();

    if (createCourseAdminRes.status === 201 && createCourseAdminData.success) {
      console.log('  -> PASS: Course created successfully as Admin');
      testCourseId = createCourseAdminData.data._id;
    } else {
      throw new Error(`FAIL: Admin course creation failed: ${JSON.stringify(createCourseAdminData)}`);
    }

    // 6. GET ALL COURSES
    console.log('\n[TEST 6] Fetching all courses...');
    const getCoursesRes = await fetch(`${BASE_URL}/api/courses`);
    const getCoursesData = await getCoursesRes.json();

    if (getCoursesRes.status === 200 && getCoursesData.success && getCoursesData.count > 0) {
      console.log(`  -> PASS: Found ${getCoursesData.count} courses in the catalog`);
    } else {
      throw new Error(`FAIL: Course retrieval failed: ${JSON.stringify(getCoursesData)}`);
    }

    // 7. GET PROFILE & UPDATE PREFERENCES (SELECT TRACK)
    console.log('\n[TEST 7] Updating Student Profile & Verifying Learning Path generation...');
    const updateProfileRes = await fetch(`${BASE_URL}/api/users/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        selectedTrack: 'AI Software Dev',
        skillLevel: 'Beginner',
      }),
    });
    const updateProfileData = await updateProfileRes.json();

    if (updateProfileRes.status === 200 && updateProfileData.success) {
      console.log('  -> PASS: Student profile updated successfully');
      
      // Verify LearningPath creation
      const learningPath = await LearningPath.findOne({ userId: studentId }).populate('recommendedCourses');
      if (learningPath && learningPath.recommendedCourses.length > 0) {
        console.log(`  -> PASS: LearningPath generated with ${learningPath.recommendedCourses.length} recommended courses`);
        console.log(`     Stages: ${learningPath.roadmapStages.map(s => `${s.stageName} (${s.status})`).join(', ')}`);
      } else {
        throw new Error('FAIL: LearningPath was not auto-generated or has no recommended courses');
      }
    } else {
      throw new Error(`FAIL: Student profile update failed: ${JSON.stringify(updateProfileData)}`);
    }

    // 8. UPDATE PROGRESS (Toggle Lesson 1 to completed)
    console.log('\n[TEST 8] Updating progress for Lesson 1...');
    const updateProgressRes = await fetch(`${BASE_URL}/api/progress/update`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        courseId: testCourseId,
        lessonId: 'lesson-1',
        completed: true,
      }),
    });
    const updateProgressData = await updateProgressRes.json();

    if (updateProgressRes.status === 200 && updateProgressData.success) {
      const progress = updateProgressData.data;
      console.log(`  -> PASS: Progress updated successfully. Completion: ${progress.completionPercentage}%, Status: ${progress.status}`);
      if (progress.completionPercentage === 33 && progress.status === 'in-progress') {
        console.log('  -> PASS: Completion percentage and status calculated correctly');
      } else {
        throw new Error(`FAIL: Unexpected completion details: ${JSON.stringify(progress)}`);
      }
    } else {
      throw new Error(`FAIL: Progress update failed: ${JSON.stringify(updateProgressData)}`);
    }

    // 9. GET USER PROGRESS
    console.log('\n[TEST 9] Getting student progress list...');
    const getProgressRes = await fetch(`${BASE_URL}/api/progress/${studentId}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const getProgressData = await getProgressRes.json();

    if (getProgressRes.status === 200 && getProgressData.success) {
      console.log(`  -> PASS: Successfully fetched progress. Records count: ${getProgressData.count}`);
      if (getProgressData.data[0].completedLessons.includes('lesson-1')) {
        console.log('  -> PASS: Completed lesson list matches');
      } else {
        throw new Error('FAIL: Progress list missing completed lesson');
      }
    } else {
      throw new Error(`FAIL: Progress fetch failed: ${JSON.stringify(getProgressData)}`);
    }

    // 10. UPDATE PROGRESS TO 100% (Complete remaining lessons)
    console.log('\n[TEST 10] Completing all remaining lessons to verify 100% completion status transition...');
    
    // Complete lesson-2
    await fetch(`${BASE_URL}/api/progress/update`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({ courseId: testCourseId, lessonId: 'lesson-2', completed: true }),
    });

    // Complete lesson-3
    const finalProgressRes = await fetch(`${BASE_URL}/api/progress/update`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({ courseId: testCourseId, lessonId: 'lesson-3', completed: true }),
    });
    const finalProgressData = await finalProgressRes.json();

    if (finalProgressRes.status === 200 && finalProgressData.success) {
      const progress = finalProgressData.data;
      console.log(`  -> PASS: Progress final update. Completion: ${progress.completionPercentage}%, Status: ${progress.status}`);
      if (progress.completionPercentage === 100 && progress.status === 'completed') {
        console.log('  -> PASS: Course status correctly transitioned to "completed" at 100%');
      } else {
        throw new Error(`FAIL: Course status is not "completed" at 100%: ${JSON.stringify(progress)}`);
      }
    } else {
      throw new Error(`FAIL: Progress final update failed: ${JSON.stringify(finalProgressData)}`);
    }

    // 11. UPDATE COURSE (AS ADMIN)
    console.log('\n[TEST 11] Updating Course as Admin...');
    const updateCourseRes = await fetch(`${BASE_URL}/api/courses/${testCourseId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        duration: '5 weeks',
        difficulty: 'Intermediate',
      }),
    });
    const updateCourseData = await updateCourseRes.json();

    if (updateCourseRes.status === 200 && updateCourseData.success) {
      console.log(`  -> PASS: Course updated successfully. New Duration: ${updateCourseData.data.duration}, Difficulty: ${updateCourseData.data.difficulty}`);
    } else {
      throw new Error(`FAIL: Course update failed: ${JSON.stringify(updateCourseData)}`);
    }

    // 12. DELETE COURSE (AS ADMIN)
    console.log('\n[TEST 12] Deleting Course as Admin...');
    const deleteCourseRes = await fetch(`${BASE_URL}/api/courses/${testCourseId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const deleteCourseData = await deleteCourseRes.json();

    if (deleteCourseRes.status === 200 && deleteCourseData.success) {
      console.log('  -> PASS: Course deleted successfully');
    } else {
      throw new Error(`FAIL: Course deletion failed: ${JSON.stringify(deleteCourseData)}`);
    }

    console.log('\n--- ALL TESTS COMPLETED SUCCESSFULLY! ---');
  } catch (error) {
    console.error(`\n!!! TEST SUITE ENCOUNTERED AN ERROR !!!\n${error.message}`);
    process.exit(1);
  } finally {
    console.log('\nClosing database connection...');
    try {
      await mongoose.connection.close();
    } catch (dbErr) {
      console.error('Error during connection close:', dbErr.message);
    }
    
    if (mongoServer) {
      console.log('Stopping in-memory MongoDB server...');
      try {
        await mongoServer.stop();
      } catch (srvErr) {
        console.error('Error stopping mongo server:', srvErr.message);
      }
    }
    
    console.log('Exiting integration tests.');
    process.exit(0);
  }
}

runTests();
