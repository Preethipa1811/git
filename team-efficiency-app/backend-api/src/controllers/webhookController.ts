import { Request, Response } from 'express';
import crypto from 'crypto';
import { Pool } from 'pg';
import { ApprovalService } from '../services/approvalService';
import { WebhookService, GitHubWebhookPayload } from '../services/webhookService';
import { getSocketService } from '../services/socketService';

export class WebhookController {
  private approvalService: ApprovalService;
  private webhookService: WebhookService;
  private socketService = getSocketService();

  constructor() {
    const db = new Pool({
      connectionString: process.env.DATABASE_URL
    });

    this.approvalService = new ApprovalService(db);
    this.webhookService = new WebhookService(
      process.env.GITHUB_TOKEN || '',
      process.env.GITHUB_WEBHOOK_SECRET || ''
    );
  }

  private validateWebhook(req: Request): boolean {
    const signature = req.header('X-Hub-Signature-256');
    if (!signature) {
      return false;
    }

    const payload = JSON.stringify(req.body);
    return this.webhookService.validateWebhookSignature(payload, signature);
  }

  handlePROpened = async (req: Request, res: Response) => {
    try {
      if (!this.validateWebhook(req)) {
        return res.status(401).json({ error: 'Invalid webhook signature' });
      }

      const payload = req.body as GitHubWebhookPayload;
      const pullRequest = await this.webhookService.handlePROpened(payload);

      await this.db.query(
        `INSERT INTO pull_requests (
          id, title, author, description, repository, branch,
          files_changed, additions, deletions, labels, priority,
          github_pr_id, github_repo, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        ON CONFLICT (github_pr_id, github_repo)
        DO UPDATE SET
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          files_changed = EXCLUDED.files_changed,
          additions = EXCLUDED.additions,
          deletions = EXCLUDED.deletions,
          labels = EXCLUDED.labels,
          priority = EXCLUDED.priority,
          updated_at = EXCLUDED.updated_at`,
        [
          pullRequest.id, pullRequest.title, pullRequest.author, pullRequest.description,
          pullRequest.repository, pullRequest.branch, pullRequest.filesChanged,
          pullRequest.additions, pullRequest.deletions, pullRequest.labels,
          pullRequest.priority, pullRequest.githubPrId, pullRequest.githubRepo,
          pullRequest.createdAt, pullRequest.updatedAt
        ]
      );

      const approval = await this.approvalService.createApproval(pullRequest);

      this.socketService.broadcastNewApproval(approval);

      await this.webhookService.postPRComment(
        pullRequest.repository,
        pullRequest.githubPrId!,
        `🤖 **Team Efficiency Bot**: Your PR has been added to the approval queue! Priority: ${pullRequest.priority}`
      );

      await this.webhookService.updatePRStatus(
        pullRequest.repository,
        payload.pull_request.head.sha,
        'pending',
        'Waiting for team approval'
      );

      res.json({ success: true, data: { approvalId: approval.id } });
    } catch (error) {
      console.error('Error handling PR opened webhook:', error);
      res.status(500).json({ error: 'Failed to process webhook' });
    }
  };

  handlePRClosed = async (req: Request, res: Response) => {
    try {
      if (!this.validateWebhook(req)) {
        return res.status(401).json({ error: 'Invalid webhook signature' });
      }

      const payload = req.body as GitHubWebhookPayload;
      const { githubPrId, githubRepo } = await this.webhookService.handlePRClosed(payload);

      const { rows } = await this.db.query(
        `SELECT pr.id FROM pull_requests pr
         WHERE pr.github_pr_id = $1 AND pr.github_repo = $2`,
        [githubPrId, githubRepo]
      );

      if (rows.length > 0) {
        const pullRequestId = rows[0].id;

        await this.db.query(
          `UPDATE approvals
           SET status = 'approved', completed_at = $1
           WHERE pull_request_id = $2 AND status IN ('pending', 'in_review', 'escalated')`,
          [new Date(), pullRequestId]
        );

        this.socketService.emit('queue_updated', {
          type: 'queue_updated',
          timestamp: new Date()
        });

        await this.webhookService.updatePRStatus(
          githubRepo,
          payload.pull_request.head.sha,
          'success',
          'PR approved and merged'
        );
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Error handling PR closed webhook:', error);
      res.status(500).json({ error: 'Failed to process webhook' });
    }
  };

  handlePRUpdated = async (req: Request, res: Response) => {
    try {
      if (!this.validateWebhook(req)) {
        return res.status(401).json({ error: 'Invalid webhook signature' });
      }

      const payload = req.body as GitHubWebhookPayload;
      const pullRequest = await this.webhookService.handlePRUpdated(payload);

      await this.db.query(
        `UPDATE pull_requests
         SET title = $1, description = $2, files_changed = $3,
             additions = $4, deletions = $5, labels = $6,
             priority = $7, updated_at = $8
         WHERE github_pr_id = $9 AND github_repo = $10`,
        [
          pullRequest.title, pullRequest.description, pullRequest.filesChanged,
          pullRequest.additions, pullRequest.deletions, pullRequest.labels,
          pullRequest.priority, pullRequest.updatedAt, pullRequest.githubPrId, pullRequest.githubRepo
        ]
      );

      const { rows } = await this.db.query(
        `SELECT a.id FROM approvals a
         JOIN pull_requests pr ON a.pull_request_id = pr.id
         WHERE pr.github_pr_id = $1 AND pr.github_repo = $2`,
        [pullRequest.githubPrId, pullRequest.githubRepo]
      );

      if (rows.length > 0) {
        const approvalId = rows[0].id;
        const updatedApproval = await this.approvalService.getApproval(approvalId);

        if (updatedApproval) {
          this.socketService.broadcastApprovalUpdated(updatedApproval);
        }
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Error handling PR updated webhook:', error);
      res.status(500).json({ error: 'Failed to process webhook' });
    }
  };

  private get db() {
    return new Pool({
      connectionString: process.env.DATABASE_URL
    });
  }
}