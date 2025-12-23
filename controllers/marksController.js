const Assessment = require('../models/Assessment');
const Mark = require('../models/Mark');
const User = require('../models/User');
const mongoose = require('mongoose');

// @desc    Create a new assessment (Marks Template)
// @route   POST /api/marks/assessments
// @access  Private (Faculty, Admin, HOD)
const createAssessment = async (req, res) => {
    try {
        const { title, type, otherTitle, course, section, semester, totalMarks, date } = req.body;

        const assessment = await Assessment.create({
            title,
            type,
            otherTitle,
            course,
            section,
            semester,
            totalMarks,
            faculty: req.user._id,
            date: date || new Date(),
        });

        res.status(201).json({
            success: true,
            assessment,
        });
    } catch (error) {
        console.error('Create assessment error:', error);
        res.status(500).json({ message: error.message || 'Server error' });
    }
};

// @desc    Get assessments for a faculty
// @route   GET /api/marks/assessments
// @access  Private (Faculty, Admin, HOD)
const getFacultyAssessments = async (req, res) => {
    try {
        const { course, section, semester } = req.query;
        const query = { faculty: req.user._id };

        if (course) query.course = course;
        if (section) query.section = section;
        if (semester) query.semester = semester;

        const assessments = await Assessment.find(query)
            .populate('course', 'name code')
            .populate('section', 'name')
            .sort('-createdAt');

        res.json({
            success: true,
            assessments,
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get marks for an assessment
// @route   GET /api/marks/assessments/:id/marks
// @access  Private (Faculty, Admin, HOD)
const getAssessmentMarks = async (req, res) => {
    try {
        const assessment = await Assessment.findById(req.params.id);
        if (!assessment) {
            return res.status(404).json({ message: 'Assessment not found' });
        }

        // Get students in this section
        const students = await User.find({
            section: assessment.section,
            role: 'student',
            isActive: true,
        }).select('name enrollmentNumber');

        // Get existing marks
        const marks = await Mark.find({ assessment: req.params.id });

        // Map marks to students
        const studentMarks = students.map((student) => {
            const mark = marks.find((m) => m.student.toString() === student._id.toString());
            return {
                studentId: student._id,
                name: student.name,
                enrollmentNumber: student.enrollmentNumber,
                obtainedMarks: mark ? mark.obtainedMarks : '',
                remarks: mark ? mark.remarks : '',
                markId: mark ? mark._id : null,
            };
        });

        res.json({
            success: true,
            assessment,
            studentMarks,
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Bulk update marks
// @route   PUT /api/marks/assessments/:id/marks
// @access  Private (Faculty, Admin, HOD)
const bulkUpdateMarks = async (req, res) => {
    try {
        const { marks } = req.body; // Array of { studentId, obtainedMarks, remarks }
        const assessmentId = req.params.id;

        const assessment = await Assessment.findById(assessmentId);
        if (!assessment) {
            return res.status(404).json({ message: 'Assessment not found' });
        }

        const operations = marks.map((m) => ({
            updateOne: {
                filter: { assessment: assessmentId, student: m.studentId },
                update: {
                    obtainedMarks: m.obtainedMarks,
                    remarks: m.remarks,
                },
                upsert: true,
            },
        }));

        await Mark.bulkWrite(operations);

        res.json({
            success: true,
            message: 'Marks updated successfully',
        });
    } catch (error) {
        console.error('Bulk update marks error:', error);
        res.status(400).json({ message: error.message || 'Error updating marks' });
    }
};

// @desc    Get student performance and rank
// @route   GET /api/marks/performance
// @access  Private (Student)
const getStudentPerformance = async (req, res) => {
    try {
        const studentId = req.user._id;
        const student = await User.findById(studentId);

        // Find all marks for this student
        const studentMarks = await Mark.find({ student: studentId })
            .populate({
                path: 'assessment',
                populate: { path: 'course', select: 'name code' },
            })
            .sort('createdAt');

        // Calculate overall stats
        let totalPossible = 0;
        let totalObtained = 0;
        const subjectPerformance = {};

        studentMarks.forEach((m) => {
            const assessment = m.assessment;
            totalPossible += assessment.totalMarks;
            totalObtained += m.obtainedMarks;

            const courseId = assessment.course._id.toString();
            if (!subjectPerformance[courseId]) {
                subjectPerformance[courseId] = {
                    name: assessment.course.name,
                    code: assessment.course.code,
                    totalPossible: 0,
                    totalObtained: 0,
                    assessments: [],
                };
            }
            subjectPerformance[courseId].totalPossible += assessment.totalMarks;
            subjectPerformance[courseId].totalObtained += m.obtainedMarks;
            subjectPerformance[courseId].assessments.push({
                title: assessment.title,
                type: assessment.type,
                obtained: m.obtainedMarks,
                total: assessment.totalMarks,
                percentage: ((m.obtainedMarks / assessment.totalMarks) * 100).toFixed(2),
            });
        });

        // Calculate Rank in Section
        // To find rank, we need to compare this student's total percentage with others in the same section
        const peers = await User.find({ section: student.section, role: 'student', isActive: true });

        const peerPerformances = await Promise.all(peers.map(async (peer) => {
            const marks = await Mark.find({ student: peer._id }).populate('assessment');
            let pTotalPossible = 0;
            let pTotalObtained = 0;
            marks.forEach(m => {
                pTotalPossible += m.assessment.totalMarks;
                pTotalObtained += m.obtainedMarks;
            });
            return {
                id: peer._id.toString(),
                percentage: pTotalPossible > 0 ? (pTotalObtained / pTotalPossible) * 100 : 0
            };
        }));

        const sortedPeers = peerPerformances.sort((a, b) => b.percentage - a.percentage);
        const rank = sortedPeers.findIndex(p => p.id === studentId.toString()) + 1;

        res.json({
            success: true,
            summary: {
                totalObtained,
                totalPossible,
                overallPercentage: totalPossible > 0 ? ((totalObtained / totalPossible) * 100).toFixed(2) : 0,
                rank,
                totalStudents: peers.length,
            },
            subjectWise: Object.values(subjectPerformance).map(s => ({
                ...s,
                percentage: ((s.totalObtained / s.totalPossible) * 100).toFixed(2)
            })),
            recentAssessments: studentMarks.slice(-5).map(m => ({
                title: m.assessment.title,
                course: m.assessment.course.name,
                obtained: m.obtainedMarks,
                total: m.assessment.totalMarks,
            }))
        });
    } catch (error) {
        console.error('Get performance error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    createAssessment,
    getFacultyAssessments,
    getAssessmentMarks,
    bulkUpdateMarks,
    getStudentPerformance,
};
