const express = require('express');
const {
    createCourse,
    getAllCourses,
    getCourseById,
    updateCourse,
    deleteCourse,
} = require('../controllers/courseController');
const { protect } = require('../middleware/auth');
const { checkRole } = require('../middleware/roleCheck');

const router = express.Router();

// Create and get all courses
router.post('/', protect, checkRole('admin', 'hod'), createCourse);
router.get('/', protect, getAllCourses);

// Get, update, and delete specific course
router.get('/:id', protect, getCourseById);
router.put('/:id', protect, checkRole('admin', 'hod'), updateCourse);
router.delete('/:id', protect, checkRole('admin'), deleteCourse);

module.exports = router;
