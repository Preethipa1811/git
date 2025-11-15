import { Pool } from 'pg';
import { Metrics } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class MetricsService {
  private db: Pool;

  constructor(db: Pool) {
    this.db = db;
  }

  async getTeamMetrics(timePeriod: 'day' | 'week' | 'month' = 'week'): Promise<Metrics> {
    const timeFilter = this.getTimeFilter(timePeriod);

    const avgReviewTime = await this.getAverageReviewTime(timeFilter);
    const approvalVelocity = await this.getApprovalVelocity(timeFilter);
    const bottlenecks = await this.getBottlenecks(timeFilter);
    const escalationRate = await this.getEscalationRate(timeFilter);
    const teamAvailability = await this.getTeamAvailability();

    return {
      teamId: '00000000-0000-0000-0000-000000000000',
      averageReviewTime: avgReviewTime,
      approvalVelocity,
      bottlenecks,
      escalationRate,
      teamAvailability,
      timePeriod
    };
  }

  async getReviewerMetrics(reviewerId: string, timePeriod: 'day' | 'week' | 'month' = 'week'): Promise<any> {
    const timeFilter = this.getTimeFilter(timePeriod);

    const { rows } = await this.db.query(`
      SELECT
        COUNT(*) as total_reviews,
        AVG(EXTRACT(EPOCH FROM (completed_at - assigned_at))/3600) as avg_review_hours,
        COUNT(*) FILTER (WHERE completed_at <= sla_deadline) as on_time_reviews,
        COUNT(*) FILTER (WHERE status = 'escalated') as escalated_reviews
      FROM approvals
      WHERE assigned_reviewer_id = $1
      AND completed_at IS NOT NULL
      AND assigned_at ${timeFilter}
    `, [reviewerId]);

    const stats = rows[0];

    const { rows: currentWorkload } = await this.db.query(
      'SELECT current_workload FROM team_members WHERE id = $1',
      [reviewerId]
    );

    return {
      totalReviews: parseInt(stats.total_reviews) || 0,
      averageReviewTime: parseFloat(stats.avg_review_hours) || 0,
      onTimeRate: stats.total_reviews > 0 ? (stats.on_time_reviews / stats.total_reviews) * 100 : 100,
      escalatedCount: parseInt(stats.escalated_reviews) || 0,
      currentWorkload: currentWorkload[0]?.current_workload || 0,
      timePeriod
    };
  }

  async getTrends(timePeriod: 'day' | 'week' | 'month' = 'week'): Promise<any[]> {
    let timeGrouping: string;
    let lookbackPeriod: string;

    switch (timePeriod) {
      case 'day':
        timeGrouping = 'DATE_TRUNC(\'hour\', created_at)';
        lookbackPeriod = '7 days';
        break;
      case 'week':
        timeGrouping = 'DATE_TRUNC(\'day\', created_at)';
        lookbackPeriod = '30 days';
        break;
      case 'month':
        timeGrouping = 'DATE_TRUNC(\'week\', created_at)';
        lookbackPeriod = '90 days';
        break;
    }

    const { rows } = await this.db.query(`
      SELECT
        ${timeGrouping} as time_period,
        COUNT(*) as approvals_created,
        COUNT(*) FILTER (WHERE completed_at IS NOT NULL) as approvals_completed,
        AVG(EXTRACT(EPOCH FROM (completed_at - assigned_at))/3600) as avg_review_time,
        COUNT(*) FILTER (WHERE completed_at <= sla_deadline) as on_time_approvals
      FROM approvals
      WHERE created_at >= NOW() - INTERVAL '${lookbackPeriod}'
      GROUP BY ${timeGrouping}
      ORDER BY time_period DESC
    `);

    return rows.map(row => ({
      timePeriod: row.time_period,
      approvalsCreated: parseInt(row.approvals_created),
      approvalsCompleted: parseInt(row.approvals_completed),
      averageReviewTime: parseFloat(row.avg_review_time) || 0,
      onTimeRate: row.approvals_created > 0 ? (row.on_time_approvals / row.approvals_created) * 100 : 100
    }));
  }

  async getBottlenecks(timePeriod: 'day' | 'week' | 'month' = 'week'): Promise<any[]> {
    const timeFilter = this.getTimeFilter(timePeriod);

    const { rows } = await this.db.query(`
      SELECT
        tm.id as reviewer_id,
        tm.name as reviewer_name,
        COUNT(a.id) as current_assignments,
        AVG(EXTRACT(EPOCH FROM (NOW() - a.assigned_at))/3600) as avg_time_in_queue,
        COUNT(a.id) FILTER (WHERE a.status = 'escalated') as escalations
      FROM team_members tm
      LEFT JOIN approvals a ON tm.id = a.assigned_reviewer_id
        AND a.status IN ('in_review', 'escalated')
      WHERE tm.is_active = true
      GROUP BY tm.id, tm.name
      HAVING COUNT(a.id) >= tm.max_workload
         OR AVG(EXTRACT(EPOCH FROM (NOW() - a.assigned_at))/3600) > 8
         OR COUNT(a.id) FILTER (WHERE a.status = 'escalated') > 0
      ORDER BY avg_time_in_queue DESC NULLS LAST
    `);

    return rows.map(row => ({
      reviewerId: row.reviewer_id,
      reviewerName: row.reviewer_name,
      currentAssignments: parseInt(row.current_assignments) || 0,
      averageTimeInQueue: parseFloat(row.avg_time_in_queue) || 0,
      escalations: parseInt(row.escalations) || 0,
      severity: this.calculateBottleneckSeverity(row)
    }));
  }

  async calculateTeamEfficiency(): Promise<number> {
    const { rows } = await this.db.query(`
      SELECT
        COUNT(*) FILTER (WHERE completed_at <= sla_deadline) as on_time,
        COUNT(*) FILTER (WHERE completed_at IS NOT NULL) as total_completed
      FROM approvals
      WHERE completed_at >= NOW() - INTERVAL '30 days'
    `);

    if (rows[0].total_completed === 0) return 100;

    return (rows[0].on_time / rows[0].total_completed) * 100;
  }

  async getApprovalDistribution(): Promise<any> {
    const { rows } = await this.db.query(`
      SELECT
        priority,
        COUNT(*) as count,
        AVG(EXTRACT(EPOCH FROM (completed_at - assigned_at))/3600) as avg_completion_time
      FROM approvals
      WHERE completed_at IS NOT NULL
        AND completed_at >= NOW() - INTERVAL '30 days'
      GROUP BY priority
      ORDER BY
        CASE priority
          WHEN 'critical' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          WHEN 'low' THEN 4
        END
    `);

    return rows.map(row => ({
      priority: row.priority,
      count: parseInt(row.count),
      averageCompletionTime: parseFloat(row.avg_completion_time) || 0
    }));
  }

  private async getAverageReviewTime(timeFilter: string): Promise<number> {
    const { rows } = await this.db.query(`
      SELECT AVG(EXTRACT(EPOCH FROM (completed_at - assigned_at))/3600) as avg_time
      FROM approvals
      WHERE completed_at IS NOT NULL
      AND assigned_at ${timeFilter}
    `);

    return parseFloat(rows[0]?.avg_time) || 0;
  }

  private async getApprovalVelocity(timeFilter: string): Promise<number> {
    const { rows } = await this.db.query(`
      SELECT COUNT(*) as completed_approvals
      FROM approvals
      WHERE status = 'approved'
      AND completed_at ${timeFilter}
    `);

    return parseInt(rows[0]?.completed_approvals) || 0;
  }

  private async getEscalationRate(timeFilter: string): Promise<number> {
    const { rows } = await this.db.query(`
      SELECT
        COUNT(*) FILTER (WHERE escalated_at IS NOT NULL) as escalated,
        COUNT(*) as total
      FROM approvals
      WHERE created_at ${timeFilter}
    `);

    if (rows[0].total === 0) return 0;

    return (rows[0].escalated / rows[0].total) * 100;
  }

  private async getTeamAvailability(): Promise<number> {
    const { rows } = await this.db.query(`
      SELECT
        COUNT(*) FILTER (WHERE is_available = true AND is_active = true) as available,
        COUNT(*) FILTER (WHERE is_active = true) as total_active
      FROM team_members
    `);

    if (rows[0].total_active === 0) return 0;

    return (rows[0].available / rows[0].total_active) * 100;
  }

  private calculateBottleneckSeverity(row: any): 'low' | 'medium' | 'high' {
    const currentAssignments = parseInt(row.current_assignments) || 0;
    const avgTimeInQueue = parseFloat(row.avg_time_in_queue) || 0;
    const escalations = parseInt(row.escalations) || 0;

    if (avgTimeInQueue > 16 || escalations > 2 || currentAssignments >= 3) {
      return 'high';
    } else if (avgTimeInQueue > 8 || escalations > 0 || currentAssignments >= 2) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  private getTimeFilter(timePeriod: 'day' | 'week' | 'month'): string {
    switch (timePeriod) {
      case 'day':
        return '>= NOW() - INTERVAL \'24 hours\'';
      case 'week':
        return '>= NOW() - INTERVAL \'7 days\'';
      case 'month':
        return '>= NOW() - INTERVAL \'30 days\'';
    }
  }

  async storeMetrics(timePeriod: 'day' | 'week' | 'month'): Promise<void> {
    const metrics = await this.getTeamMetrics(timePeriod);

    const periodStart = new Date();
    const periodEnd = new Date();

    switch (timePeriod) {
      case 'day':
        periodStart.setHours(0, 0, 0, 0);
        periodEnd.setHours(23, 59, 59, 999);
        break;
      case 'week':
        periodStart.setDate(periodStart.getDate() - periodStart.getDay());
        periodStart.setHours(0, 0, 0, 0);
        periodEnd.setDate(periodStart.getDate() + 6);
        periodEnd.setHours(23, 59, 59, 999);
        break;
      case 'month':
        periodStart.setDate(1);
        periodStart.setHours(0, 0, 0, 0);
        periodEnd.setMonth(periodEnd.getMonth() + 1, 0);
        periodEnd.setHours(23, 59, 59, 999);
        break;
    }

    await this.db.query(`
      INSERT INTO metrics (
        id, team_id, average_review_time, approval_velocity, escalation_rate,
        team_availability, time_period, period_start, period_end
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [
      uuidv4(),
      metrics.teamId,
      metrics.averageReviewTime,
      metrics.approvalVelocity,
      metrics.escalationRate,
      metrics.teamAvailability,
      metrics.timePeriod,
      periodStart,
      periodEnd
    ]);
  }
}