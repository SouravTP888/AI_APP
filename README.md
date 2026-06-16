# LMS Automation Engine - Backend

This is the backend service for the AI-Powered LMS Automation Engine, built using Node.js, Express, MongoDB, and Mongoose, secured with JSON Web Tokens (JWT).

## Features

- **Clean MVC Architecture**: Organized code separating database schemas (models), logic (controllers), routes, and middleware.
- **Authentication**: JWT token-based authentication with student and admin role-based authorization.
- **User Profile Management**: Allow students to update profiles, selected tracks, and skill levels.
- **Dynamic Learning Paths**: Automatically creates a personalized `LearningPath` containing roadmap stages and course recommendations when a student updates their track.
- **Course Catalog (CRUD)**: Public endpoints to fetch courses, and restricted endpoints allowing only Admin users to create, update, and delete courses.
- **Progress Tracking**: Tracks lesson-level and course-level completion, dynamically calculating completion percentages and status transitions (`not-started` -> `in-progress` -> `completed` at 100%).
- **Self-Contained Verification**: Automated API testing suite that runs on an in-memory MongoDB container.

---

## Folder Structure

```
backend/
├── config/             # Database connection configurations
│   └── db.js
├── controllers/        # Request handling and business logic
│   ├── authController.js
│   ├── courseController.js
│   ├── progressController.js
│   └── userController.js
├── middleware/         # Custom Express middlewares (Auth, Validation, Errors)
│   ├── authMiddleware.js
│   ├── errorMiddleware.js
│   └── validationMiddleware.js
├── models/             # Mongoose database models (User, Course, Progress, LearningPath)
│   ├── Course.js
│   ├── LearningPath.js
│   ├── Progress.js
│   └── User.js
├── routes/             # REST API routes declarations
│   ├── authRoutes.js
│   ├── courseRoutes.js
│   ├── progressRoutes.js
│   └── userRoutes.js
├── .env                # Local environment variables configuration
├── package.json        # Project scripts and dependencies
├── server.js           # Server entry point
└── test-api.js         # Integration tests with in-memory DB runner
```

---

## Environment Setup

Create a `.env` file in the `backend/` directory with the following variables:

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/lms_automation
JWT_SECRET=super_secret_jwt_key_lms_engine_2026
NODE_ENV=development
```

- **`PORT`**: Port number for the server to listen on.
- **`MONGO_URI`**: MongoDB connection string.
- **`JWT_SECRET`**: Private key used to sign and verify JSON Web Tokens.
- **`NODE_ENV`**: App environment mode (`development`, `production`, etc.).

---

## Installation & Running

### Prerequisites

- Node.js (v18+)
- MongoDB (running locally or a cloud URI, if running the main server)

### Steps

1. **Navigate to the backend directory**:
   ```bash
   cd backend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Run in development mode (with hot reloading via nodemon)**:
   ```bash
   npm run dev
   ```

4. **Run in production mode**:
   ```bash
   npm start
   ```

---

## Running Integration Tests

To run the automated test suite (spins up its own in-memory database and tests all API endpoints):

```bash
npm test
```

---

## API Endpoints

### 1. Authentication (`/api/auth`)

| Method | Endpoint | Access | Body Fields | Description |
| :--- | :--- | :--- | :--- | :--- |
| **POST** | `/register` | Public | `name`, `email`, `password`, `role` (optional), `selectedTrack` (optional), `skillLevel` (optional) | Register a new user (Student or Admin). Hashes password and returns JWT token. |
| **POST** | `/login` | Public | `email`, `password` | Logs in a user. Validates password and returns JWT token. |

### 2. User Profile Management (`/api/users`)

| Method | Endpoint | Access | Headers | Body Fields | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **GET** | `/profile` | Private | `Authorization: Bearer <JWT>` | *None* | Get current user's profile details. |
| **PUT** | `/profile` | Private | `Authorization: Bearer <JWT>` | `name` (opt), `email` (opt), `selectedTrack` (opt), `skillLevel` (opt) | Update profile details. Selecting a track/level triggers automated `LearningPath` and roadmap stages generation. |

### 3. Course Management (`/api/courses`)

| Method | Endpoint | Access | Headers | Body Fields | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **GET** | `/` | Public | *None* | *None* | Retrieve all courses. |
| **POST** | `/` | Private (Admin) | `Authorization: Bearer <JWT>` | `title`, `description`, `category`, `difficulty`, `duration`, `modules` | Create a new course with modules and lessons. |
| **PUT** | `/:id` | Private (Admin) | `Authorization: Bearer <JWT>` | Fields to update | Update course details. |
| **DELETE** | `/:id` | Private (Admin) | `Authorization: Bearer <JWT>` | *None* | Delete a course by ID. |

### 4. Progress Tracking (`/api/progress`)

| Method | Endpoint | Access | Headers | Body Fields | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **GET** | `/:userId` | Private (Owner/Admin) | `Authorization: Bearer <JWT>` | *None* | Fetch progress details for all courses associated with a user. |
| **PUT** | `/update` | Private | `Authorization: Bearer <JWT>` | `courseId`, `lessonId`, `completed` (boolean), `userId` (opt, Admin only) | Toggles a lesson completed or incomplete, dynamically recalculates the completion percentage and status. |

---

## Schema Details

### User Schema
- `name` (String, required)
- `email` (String, required, unique)
- `password` (String, required, select: false)
- `role` (String, enum: `['Student', 'Admin']`, default: `'Student'`)
- `selectedTrack` (String)
- `skillLevel` (String, enum: `['Beginner', 'Intermediate', 'Advanced', '']`)

### Course Schema
- `title` (String, required)
- `description` (String, required)
- `category` (String, required)
- `difficulty` (String, enum: `['Beginner', 'Intermediate', 'Advanced']`, required)
- `duration` (String, required)
- `modules` (Array of Modules):
  - `title` (String)
  - `lessons` (Array of Lessons: `id`, `title`, `content`)

### Progress Schema
- `userId` (ObjectId ref User, required)
- `courseId` (ObjectId ref Course, required)
- `completedLessons` (Array of String lesson IDs)
- `completionPercentage` (Number)
- `status` (String, enum: `['not-started', 'in-progress', 'completed']`)

### LearningPath Schema
- `userId` (ObjectId ref User, required, unique)
- `recommendedCourses` (Array of ObjectId ref Course)
- `roadmapStages` (Array of Stages):
  - `stageName` (String)
  - `status` (String, enum: `['locked', 'unlocked', 'completed']`)
  - `courses` (Array of ObjectId ref Course)
