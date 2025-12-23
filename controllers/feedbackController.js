const Feedback = require('../models/Feedback');
const Course = require('../models/Course');

// @desc    Submit student feedback
// @route   POST /api/feedback
// @access  Private (Student)
const submitFeedback = async (req, res) => {
    try {
        const { courseId, facultyId, courseContent, teachingQuality, supportMaterial, overallRating, comments, isAnonymous } = req.body;

        // Verify course exists
        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }

        const feedback = await Feedback.create({
            student: req.user._id,
            department: req.user.department,
            course: courseId,
            faculty: facultyId,
            semester: req.user.semester,
            courseContent,
            teachingQuality,
            supportMaterial,
            overallRating,
            comments,
            isAnonymous: isAnonymous !== undefined ? isAnonymous : true,
        });

        res.status(201).json({
            success: true,
            feedback,
        });
    } catch (error) {
        console.error('Submit feedback error:', error);
        if (error.code === 11000) {
            return res.status(400).json({ message: 'You have already submitted feedback for this course this semester' });
        }
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get feedback analytics (Admin/HOD)
// @route   GET /api/feedback/stats
// @access  Private (Admin, HOD)
const getFeedbackStats = async (req, res) => {
    try {
        let query = {};

        // HODs only see their department's feedback
        if (req.user.role === 'hod') {
            query.department = req.user.department;
        }

        const stats = await Feedback.aggregate([
            { $match: query },
            {
                $group: {
                    _id: '$course',
                    avgCourseContent: { $avg: '$courseContent' },
                    avgTeachingQuality: { $avg: '$teachingQuality' },
                    avgSupportMaterial: { $avg: '$supportMaterial' },
                    avgOverall: { $avg: '$overallRating' },
                    totalSubmissions: { $sum: 1 },
                }
            },
            {
                $lookup: {
                    from: 'courses',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'courseInfo'
                }
            },
            { $unwind: '$courseInfo' },
            {
                $project: {
                    courseName: '$courseInfo.name',
                    courseCode: '$courseInfo.code',
                    avgCourseContent: { $round: ['$avgCourseContent', 1] },
                    avgTeachingQuality: { $round: ['$avgTeachingQuality', 1] },
                    avgSupportMaterial: { $round: ['$avgSupportMaterial', 1] },
                    avgOverall: { $round: ['$avgOverall', 1] },
                    totalSubmissions: 1,
                }
            }
        ]);

        res.json({
            success: true,
            stats,
        });
    } catch (error) {
        console.error('Get feedback stats error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    submitFeedback,
    getFeedbackStats,
};
