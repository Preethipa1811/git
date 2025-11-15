import { Router } from 'express';
import { ApprovalController } from '../controllers/approvalController';

const router = Router();
const approvalController = new ApprovalController();

router.get('/queue', approvalController.getApprovalQueue);
router.post('/assign', approvalController.assignReviewer);
router.post('/escalate/:approvalId', approvalController.escalateApproval);
router.get('/my-assignments/:reviewerId', approvalController.getMyAssignments);
router.post('/complete/:approvalId', approvalController.completeReview);
router.get('/sla-status', approvalController.getSLAStatus);

export default router;