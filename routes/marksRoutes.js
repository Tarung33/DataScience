const express = require('express');
const {
    createAssessment,
    getFacultyAssessments,
    getAssessmentMarks,
    bulkUpdateMarks,
    getStudentPerformance,
} = require('../controllers/marksController');
const { protect } = require('../middleware/auth');
const { checkRole } = require('../middleware/roleCheck');

const router = express.Router();

// Faculty routes
router.post('/assessments', protect, checkRole('faculty', 'admin', 'hod'), createAssessment);
router.get('/assessments', protect, checkRole('faculty', 'admin', 'hod'), getFacultyAssessments);
router.get('/assessments/:id/marks', protect, checkRole('faculty', 'admin', 'hod'), getAssessmentMarks);
router.put('/assessments/:id/marks', protect, checkRole('faculty', 'admin', 'hod'), bulkUpdateMarks);

// Student routes
router.get('/performance', protect, checkRole('student'), getStudentPerformance);

module.exports = router;
