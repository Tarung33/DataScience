const express = require('express');
const router = express.Router();
const {
    getMyGroups,
    getGroupMessages,
    sendMessage,
    createGroup,
    reactToMessage,
} = require('../controllers/groupController');
const { protect } = require('../middleware/auth');
const { checkRole } = require('../middleware/roleCheck');

router.use(protect);

router.get('/', getMyGroups);
router.post('/', checkRole('admin', 'hod', 'faculty'), createGroup);

router.get('/:id/messages', getGroupMessages);
router.post('/:id/messages', sendMessage);
router.post('/messages/:id/react', reactToMessage);

module.exports = router;
