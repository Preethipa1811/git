import { Pool } from 'pg';
import { ApprovalService } from './approvalService';
import { NotificationService } from './notificationService';
import cron from 'node-cron';

export class EscalationService {
  private db: Pool;
  private approvalService: ApprovalService;
  private notificationService: NotificationService;

  constructor(db: Pool, approvalService: ApprovalService, notificationService: NotificationService) {
    this.db = db;
    this.approvalService = approvalService;
    this.notificationService = notificationService;

    this.setupEscalationCron();
  }

  private setupEscalationCron(): void {
    cron.schedule('*/15 * * * *', async () => {
      console.log('Running escalation check...');
      await this.checkEscalations();
    });

    cron.schedule('0 * * * *', async () => {
      console.log('Running SLA warning check...');
      await this.checkSLAWarnings();
    });

    cron.schedule('0 0 * * *', async () => {
      console.log('Running daily bottleneck report...');
      await this.generateBottleneckReport();
    });
  }

  async checkEscalations(): Promise<void> {
    const { rows } = await this.db.query(`
      SELECT a.*, sr.escalation_hours
      FROM approvals a
      JOIN sla_rules sr ON a.priority = sr.priority
      WHERE a.status IN ('in_review', 'pending')
      AND a.escalated_at IS NULL
      AND a.sla_deadline < NOW() - INTERVAL '1 hour' * sr.escalation_hours
    `);

    for (const approval of rows) {
      try {
        await this.approvalService.escalateApproval(approval.id);
        console.log(`Escalated approval ${approval.id}`);
      } catch (error) {
        console.error(`Failed to escalate approval ${approval.id}:`, error);
      }
    }
  }

  async checkSLAWarnings(): Promise<void> {
    const { rows } = await this.db.query(`
      SELECT a.*, tm.id as reviewer_id
      FROM approvals a
      JOIN team_members tm ON a.assigned_reviewer_id = tm.id
      WHERE a.status = 'in_review'
      AND a.sla_deadline < NOW()
      AND a.escalated_at IS NULL
    `);

    for (const approval of rows) {
      try {
        await this.notificationService.notifyOverdueApproval(approval.id, approval.reviewer_id);
        console.log(`Sent overdue notification for approval ${approval.id}`);
      } catch (error) {
        console.error(`Failed to send overdue notification for ${approval.id}:`, error);
      }
    }

    const upcomingSLA = await this.db.query(`
      SELECT a.*, tm.id as reviewer_id
      FROM approvals a
      JOIN team_members tm ON a.assigned_reviewer_id = tm.id
      WHERE a.status = 'in_review'
      AND a.sla_deadline BETWEEN NOW() AND NOW() + INTERVAL '2 hours'
      AND a.escalated_at IS NULL
    `);

    for (const approval of upcomingSLA.rows) {
      try {
        await this.notificationService.createNotification(
          approval.reviewer_id,
          'overdue',
          'SLA Warning',
          `Your review is approaching the SLA deadline. Please complete it soon.`,
          { approvalId: approval.id, slaDeadline: approval.sla_deadline }
        );
      } catch (error) {
        console.error(`Failed to send SLA warning for ${approval.id}:`, error);
      }
    }
  }

  async generateBottleneckReport(): Promise<void> {
    const bottlenecks = await this.notificationService.getTeamBottlenecks();

    if (bottlenecks.length > 0) {
      const { rows } = await this.db.query(
        'SELECT id FROM team_members WHERE role = $1 AND is_active = true',
        ['team_lead']
      );

      for (const teamLead of rows) {
        await this.notificationService.createNotification(
          teamLead.id,
          'overdue',
          'Daily Bottleneck Report',
          `Team efficiency report: ${bottlenecks.length} reviewer(s) showing bottleneck patterns.`,
          { bottlenecks, type: 'daily_report' }
        );
      }
    }
  }

  async getEscalationMetrics(): Promise<any> {
    const { rows } = await this.db.query(`
      SELECT
        DATE_TRUNC('day', created_at) as date,
        COUNT(*) as escalations,
        COUNT(DISTINCT assigned_reviewer_id) as affected_reviewers
      FROM approvals
      WHERE escalated_at IS NOT NULL
      AND created_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE_TRUNC('day', created_at)
      ORDER BY date DESC
    `);

    return rows;
  }

  async triggerManualEscalation(approvalId: string, reason: string): Promise<void> {
    const approval = await this.approvalService.escalateApproval(approvalId);

    const { rows } = await this.db.query(
      'SELECT id FROM team_members WHERE role = $1 AND is_active = true',
      ['team_lead']
    );

    for (const teamLead of rows) {
      await this.notificationService.createNotification(
        teamLead.id,
        'escalation',
        'Manual Escalation',
        `A review has been manually escalated. Reason: ${reason}`,
        { approvalId, reason, type: 'manual_escalation' }
      );
    }
  }
}