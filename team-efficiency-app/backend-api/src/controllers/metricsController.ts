import { Request, Response } from 'express';
import { Pool } from 'pg';
import { MetricsService } from '../services/metricsService';
import { NotificationService } from '../services/notificationService';
import { getSocketService } from '../services/socketService';

export class MetricsController {
  private metricsService: MetricsService;
  private notificationService: NotificationService;
  private socketService = getSocketService();

  constructor() {
    const db = new Pool({
      connectionString: process.env.DATABASE_URL
    });

    this.metricsService = new MetricsService(db);
    this.notificationService = new NotificationService(db);
  }

  getTeamMetrics = async (req: Request, res: Response) => {
    try {
      const { timePeriod } = req.query as { timePeriod?: 'day' | 'week' | 'month' };
      const metrics = await this.metricsService.getTeamMetrics(timePeriod || 'week');
      res.json({ success: true, data: metrics });
    } catch (error) {
      console.error('Error getting team metrics:', error);
      res.status(500).json({ success: false, error: 'Failed to get team metrics' });
    }
  };

  getReviewerMetrics = async (req: Request, res: Response) => {
    try {
      const { reviewerId } = req.params;
      const { timePeriod } = req.query as { timePeriod?: 'day' | 'week' | 'month' };

      if (!reviewerId) {
        return res.status(400).json({ success: false, error: 'Reviewer ID is required' });
      }

      const metrics = await this.metricsService.getReviewerMetrics(reviewerId, timePeriod || 'week');
      res.json({ success: true, data: metrics });
    } catch (error) {
      console.error('Error getting reviewer metrics:', error);
      res.status(500).json({ success: false, error: 'Failed to get reviewer metrics' });
    }
  };

  getBottlenecks = async (req: Request, res: Response) => {
    try {
      const { timePeriod } = req.query as { timePeriod?: 'day' | 'week' | 'month' };
      const bottlenecks = await this.metricsService.getBottlenecks(timePeriod || 'week');
      res.json({ success: true, data: bottlenecks });
    } catch (error) {
      console.error('Error getting bottlenecks:', error);
      res.status(500).json({ success: false, error: 'Failed to get bottlenecks' });
    }
  };

  getTrends = async (req: Request, res: Response) => {
    try {
      const { timePeriod } = req.query as { timePeriod?: 'day' | 'week' | 'month' };
      const trends = await this.metricsService.getTrends(timePeriod || 'week');
      res.json({ success: true, data: trends });
    } catch (error) {
      console.error('Error getting trends:', error);
      res.status(500).json({ success: false, error: 'Failed to get trends' });
    }
  };

  getApprovalDistribution = async (req: Request, res: Response) => {
    try {
      const distribution = await this.metricsService.getApprovalDistribution();
      res.json({ success: true, data: distribution });
    } catch (error) {
      console.error('Error getting approval distribution:', error);
      res.status(500).json({ success: false, error: 'Failed to get approval distribution' });
    }
  };

  getTeamEfficiency = async (req: Request, res: Response) => {
    try {
      const efficiency = await this.metricsService.calculateTeamEfficiency();
      res.json({ success: true, data: { efficiency } });
    } catch (error) {
      console.error('Error calculating team efficiency:', error);
      res.status(500).json({ success: false, error: 'Failed to calculate team efficiency' });
    }
  };
}