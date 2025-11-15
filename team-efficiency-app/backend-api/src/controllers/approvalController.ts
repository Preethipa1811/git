import { Request, Response } from 'express';
import { Pool } from 'pg';
import { ApprovalService } from '../services/approvalService';
import { NotificationService } from '../services/notificationService';
import { getSocketService } from '../services/socketService';

export class ApprovalController {
  private approvalService: ApprovalService;
  private notificationService: NotificationService;
  private socketService = getSocketService();

  constructor() {
    const db = new Pool({
      connectionString: process.env.DATABASE_URL
    });

    this.approvalService = new ApprovalService(db);
    this.notificationService = new NotificationService(db);
  }

  getApprovalQueue = async (req: Request, res: Response) => {
    try {
      const queue = await this.approvalService.getApprovalQueue();
      res.json({ success: true, data: queue });
    } catch (error) {
      console.error('Error getting approval queue:', error);
      res.status(500).json({ success: false, error: 'Failed to get approval queue' });
    }
  };

  assignReviewer = async (req: Request, res: Response) => {
    try {
      const { approvalId, reviewerId } = req.body;

      if (!approvalId) {
        return res.status(400).json({ success: false, error: 'Approval ID is required' });
      }

      const updatedApproval = await this.approvalService.assignReviewer(approvalId, reviewerId);

      await this.notificationService.notifyNewAssignment(approvalId, updatedApproval.assignedReviewerId!);
      this.socketService.broadcastApprovalUpdated(updatedApproval);

      res.json({ success: true, data: updatedApproval });
    } catch (error) {
      console.error('Error assigning reviewer:', error);
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed to assign reviewer' });
    }
  };

  escalateApproval = async (req: Request, res: Response) => {
    try {
      const { approvalId } = req.params;
      const { reason } = req.body;

      const escalatedApproval = await this.approvalService.escalateApproval(approvalId);

      await this.notificationService.notifyEscalation(approvalId, escalatedApproval.assignedReviewerId!);
      this.socketService.broadcastEscalation(escalatedApproval);

      res.json({ success: true, data: escalatedApproval });
    } catch (error) {
      console.error('Error escalating approval:', error);
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed to escalate approval' });
    }
  };

  getMyAssignments = async (req: Request, res: Response) => {
    try {
      const { reviewerId } = req.params;
      const assignments = await this.approvalService.getMyAssignments(reviewerId);
      res.json({ success: true, data: assignments });
    } catch (error) {
      console.error('Error getting assignments:', error);
      res.status(500).json({ success: false, error: 'Failed to get assignments' });
    }
  };

  completeReview = async (req: Request, res: Response) => {
    try {
      const { approvalId } = req.params;
      const { approved, feedback } = req.body;

      if (typeof approved !== 'boolean') {
        return res.status(400).json({ success: false, error: 'Approved status is required' });
      }

      const completedApproval = await this.approvalService.completeReview(approvalId, approved);

      if (completedApproval.pullRequest.author) {
        const { rows } = await (this.approvalService as any).db.query(
          'SELECT id FROM team_members WHERE github_username = $1',
          [completedApproval.pullRequest.author]
        );

        if (rows.length > 0) {
          await this.notificationService.notifyReviewCompleted(approvalId, rows[0].id);
        }
      }

      this.socketService.broadcastApprovalCompleted(completedApproval);

      res.json({ success: true, data: completedApproval });
    } catch (error) {
      console.error('Error completing review:', error);
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed to complete review' });
    }
  };

  getSLAStatus = async (req: Request, res: Response) => {
    try {
      const slaStatus = await this.approvalService.getSLAStatus();
      res.json({ success: true, data: slaStatus });
    } catch (error) {
      console.error('Error getting SLA status:', error);
      res.status(500).json({ success: false, error: 'Failed to get SLA status' });
    }
  };
}