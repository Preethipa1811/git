import { Router } from 'express';
import { MetricsController } from '../controllers/metricsController';

const router = Router();
const metricsController = new MetricsController();

router.get('/team', metricsController.getTeamMetrics);
router.get('/reviewer/:reviewerId', metricsController.getReviewerMetrics);
router.get('/bottlenecks', metricsController.getBottlenecks);
router.get('/trends', metricsController.getTrends);

export default router;