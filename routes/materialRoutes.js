const express = require('express');
const {
    uploadMaterial,
    getMaterials,
    deleteMaterial,
} = require('../controllers/materialController');
const { protect } = require('../middleware/auth');
const { checkRole } = require('../middleware/roleCheck');
const upload = require('../middleware/upload');

const router = express.Router();

// Upload material - Faculty, Admin, HOD
router.post('/', protect, checkRole('faculty', 'admin', 'hod'), upload.single('file'), uploadMaterial);

// Get materials - All authenticated users
router.get('/', protect, getMaterials);

// Delete material - Faculty (own), Admin, HOD
router.delete('/:id', protect, checkRole('faculty', 'admin', 'hod'), deleteMaterial);

module.exports = router;
