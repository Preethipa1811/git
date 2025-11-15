import { Pool } from 'pg';
import { Notification } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { io } from '../index';

export class NotificationService {
  private db: Pool;

  constructor(db: Pool) {
    this.db = db;
  }

  async createNotification(
    userId: string,
    type: 'assignment' | 'overdue' | 'escalation' | 'completed',
    title: string,
    message: string,
    data?: any
  ): Promise<Notification> {
    const notification: Notification = {
      id: uuidv4(),
      userId,
      type,
      title,
      message,
      createdAt: new Date(),
      read: false,
      data
    };

    await this.db.query(
      `INSERT INTO notifications (id, user_id, type, title, message, data, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [notification.id, notification.userId, notification.type, notification.title, notification.message, JSON.stringify(data), notification.createdAt]
    );

    io.to(userId).emit('notification', notification);

    return notification;
  }

  async getUserNotifications(userId: string, unreadOnly: boolean = false): Promise<Notification[]> {
    const query = unreadOnly
      ? `SELECT * FROM notifications WHERE user_id = $1 AND read_at IS NULL ORDER BY created_at DESC`
      : `SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC`;

    const { rows } = await this.db.query(query, [userId]);

    return rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      type: row.type,
      title: row.title,
      message: row.message,
      createdAt: row.created_at,
      read: row.read_at !== null,
      data: row.data
    })) as Notification[];
  }

  async markAsRead(notificationId: string): Promise<void> {
    await this.db.query(
      'UPDATE notifications SET read_at = $1 WHERE id = $2',
      [new Date(), notificationId]
    );
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.db.query(
      'UPDATE notifications SET read_at = $1 WHERE user_id = $2 AND read_at IS NULL',
      [new Date(), userId]
    );
  }

  async notifyNewAssignment(approvalId: string, reviewerId: string): Promise<void> {
    await this.createNotification(
      reviewerId,
      'assignment',
      'New Review Assignment',
      `You have been assigned a new code review to complete.`,
      { approvalId }
    );
  }

  async notifyOverdueApproval(approvalId: string, reviewerId: string): Promise<void> {
    await this.createNotification(
      reviewerId,
      'overdue',
      'Approval Overdue',
      `Your assigned review is overdue. Please complete it as soon as possible.`,
      { approvalId }
    );
  }

  async notifyEscalation(approvalId: string, teamLeadId: string): Promise<void> {
    await this.createNotification(
      teamLeadId,
      'escalation',
      'Review Escalated',
      `A code review has been escalated to you due to missed SLA.`,
      { approvalId }
    );
  }

  async notifyReviewCompleted(approvalId: string, authorId: string): Promise<void> {
    await this.createNotification(
      authorId,
      'completed',
      'Review Completed',
      `Your pull request has been reviewed and is ready for merge.`,
      { approvalId }
    );
  }

  async getTeamBottlenecks(): Promise<any[]> {
    const { rows } = await this.db.query(`
      SELECT
        tm.id as reviewer_id,
        tm.name as reviewer_name,
        COUNT(a.id) as pending_reviews,
        AVG(EXTRACT(EPOCH FROM (NOW() - a.submitted_at))/3600) as avg_wait_hours
      FROM team_members tm
      LEFT JOIN approvals a ON tm.id = a.assigned_reviewer_id
        AND a.status IN ('in_review', 'escalated')
      WHERE tm.is_active = true
      GROUP BY tm.id, tm.name
      HAVING COUNT(a.id) >= tm.max_workload OR AVG(EXTRACT(EPOCH FROM (NOW() - a.submitted_at))/3600) > 8
    `);

    return rows;
  }
}