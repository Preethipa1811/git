import { Router } from 'express';
import { WebhookController } from '../controllers/webhookController';

const router = Router();
const webhookController = new WebhookController();

router.post('/github/pr-opened', webhookController.handlePROpened);
router.post('/github/pr-closed', webhookController.handlePRClosed);
router.post('/github/pr-updated', webhookController.handlePRUpdated);

export default router;