import { Pool } from 'pg';
import { Approval, TeamMember, PullRequest, SLARule } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class ApprovalService {
  private db: Pool;

  constructor(db: Pool) {
    this.db = db;
  }

  async createApproval(pullRequest: PullRequest): Promise<Approval> {
    const slaRule = await this.getSLARule(pullRequest.priority);
    const approvalId = uuidv4();

    const approval: Approval = {
      id: approvalId,
      pullRequestId: pullRequest.id,
      pullRequest,
      status: 'pending',
      submittedAt: new Date(),
      slaDeadline: new Date(Date.now() + slaRule.targetHours * 60 * 60 * 1000),
      priority: pullRequest.priority
    };

    await this.db.query(
      `INSERT INTO approvals (id, pull_request_id, status, submitted_at, sla_deadline, priority)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [approval.id, approval.pullRequestId, approval.status, approval.submittedAt, approval.slaDeadline, approval.priority]
    );

    if (slaRule.autoAssign) {
      await this.assignReviewer(approval.id);
    }

    return approval;
  }

  async assignReviewer(approvalId: string, manualReviewerId?: string): Promise<Approval> {
    const approval = await this.getApproval(approvalId);
    if (!approval) {
      throw new Error('Approval not found');
    }

    let reviewer: TeamMember;

    if (manualReviewerId) {
      const reviewerResult = await this.getTeamMember(manualReviewerId);
      if (!reviewerResult) {
        throw new Error('Specified reviewer not found');
      }
      reviewer = reviewerResult;
    } else {
      const reviewerResult = await this.findBestReviewer(approval);
      if (!reviewerResult) {
        throw new Error('No available reviewers found');
      }
      reviewer = reviewerResult;
    }

    await this.db.query(
      `UPDATE approvals
       SET assigned_reviewer_id = $1, assigned_at = $2, status = $3
       WHERE id = $4`,
      [reviewer.id, new Date(), 'in_review', approvalId]
    );

    await this.db.query(
      `UPDATE team_members
       SET current_workload = current_workload + 1
       WHERE id = $1`,
      [reviewer.id]
    );

    await this.db.query(
      `INSERT INTO assignments (approval_id, reviewer_id, assigned_at)
       VALUES ($1, $2, $3)`,
      [approvalId, reviewer.id, new Date()]
    );

    const updatedApproval = await this.getApproval(approvalId);
    return updatedApproval!;
  }

  private async findBestReviewer(approval: Approval): Promise<TeamMember | null> {
    const { rows } = await this.db.query(
      `SELECT * FROM team_members
       WHERE is_active = true
       AND is_available = true
       AND current_workload < max_workload
       AND github_username != $1`,
      [approval.pullRequest.author]
    );

    if (rows.length === 0) {
      return null;
    }

    const reviewers = rows as TeamMember[];

    const scoredReviewers = reviewers.map(reviewer => ({
      reviewer,
      score: this.calculateReviewerScore(reviewer, approval)
    }));

    scoredReviewers.sort((a, b) => b.score - a.score);

    return scoredReviewers[0].reviewer;
  }

  private calculateReviewerScore(reviewer: TeamMember, approval: Approval): number {
    let score = 100;

    score -= (reviewer.currentWorkload / reviewer.maxWorkload) * 50;

    const expertiseMatch = reviewer.expertise.some(expertise =>
      approval.pullRequest.labels.some(label =>
        label.toLowerCase().includes(expertise.toLowerCase())
      )
    );
    if (expertiseMatch) {
      score += 30;
    }

    if (reviewer.role === 'senior_developer' || reviewer.role === 'team_lead') {
      score += 20;
    }

    const workloadRatio = reviewer.currentWorkload / reviewer.maxWorkload;
    if (workloadRatio >= 0.75) {
      score -= 25;
    } else if (workloadRatio >= 0.5) {
      score -= 10;
    }

    return Math.max(0, score);
  }

  async completeReview(approvalId: string, approved: boolean): Promise<Approval> {
    const approval = await this.getApproval(approvalId);
    if (!approval) {
      throw new Error('Approval not found');
    }

    if (approval.assignedReviewerId) {
      await this.db.query(
        `UPDATE team_members
         SET current_workload = current_workload - 1
         WHERE id = $1`,
        [approval.assignedReviewerId]
      );

      await this.db.query(
        `UPDATE assignments
         SET completed_at = $1
         WHERE approval_id = $2 AND reviewer_id = $3`,
        [new Date(), approvalId, approval.assignedReviewerId]
      );
    }

    await this.db.query(
      `UPDATE approvals
       SET status = $1, completed_at = $2
       WHERE id = $3`,
      [approved ? 'approved' : 'rejected', new Date(), approvalId]
    );

    const updatedApproval = await this.getApproval(approvalId);
    return updatedApproval!;
  }

  async escalateApproval(approvalId: string): Promise<Approval> {
    const approval = await this.getApproval(approvalId);
    if (!approval) {
      throw new Error('Approval not found');
    }

    const teamLead = await this.getTeamLead();
    if (!teamLead) {
      throw new Error('No team lead found');
    }

    await this.db.query(
      `UPDATE approvals
       SET assigned_reviewer_id = $1, escalated_at = $2, status = $3
       WHERE id = $4`,
      [teamLead.id, new Date(), 'escalated', approvalId]
    );

    const updatedApproval = await this.getApproval(approvalId);
    return updatedApproval!;
  }

  async getApprovalQueue(): Promise<Approval[]> {
    const { rows } = await this.db.query(
      `SELECT a.*, pr.*
       FROM approvals a
       JOIN pull_requests pr ON a.pull_request_id = pr.id
       WHERE a.status IN ('pending', 'in_review', 'escalated')
       ORDER BY a.sla_deadline ASC`
    );

    const approvals: Approval[] = [];
    for (const row of rows) {
      const approval: Approval = {
        id: row.id,
        pullRequestId: row.pull_request_id,
        status: row.status,
        assignedReviewerId: row.assigned_reviewer_id,
        submittedAt: row.submitted_at,
        assignedAt: row.assigned_at,
        completedAt: row.completed_at,
        escalatedAt: row.escalated_at,
        slaDeadline: row.sla_deadline,
        priority: row.priority,
        pullRequest: {
          id: row.pull_request_id,
          title: row.title,
          author: row.author,
          description: row.description,
          repository: row.repository,
          branch: row.branch,
          filesChanged: row.files_changed,
          additions: row.additions,
          deletions: row.deletions,
          labels: row.labels,
          priority: row.priority,
          createdAt: row.created_at,
          updatedAt: row.updated_at
        }
      };

      if (row.assigned_reviewer_id) {
        approval.assignedReviewer = await this.getTeamMember(row.assigned_reviewer_id);
      }

      approvals.push(approval);
    }

    return approvals;
  }

  async getMyAssignments(reviewerId: string): Promise<Approval[]> {
    const { rows } = await this.db.query(
      `SELECT a.*, pr.*
       FROM approvals a
       JOIN pull_requests pr ON a.pull_request_id = pr.id
       WHERE a.assigned_reviewer_id = $1
       AND a.status IN ('in_review', 'escalated')
       ORDER BY a.sla_deadline ASC`,
      [reviewerId]
    );

    const approvals: Approval[] = [];
    for (const row of rows) {
      const approval: Approval = {
        id: row.id,
        pullRequestId: row.pull_request_id,
        status: row.status,
        assignedReviewerId: row.assigned_reviewer_id,
        submittedAt: row.submitted_at,
        assignedAt: row.assigned_at,
        completedAt: row.completed_at,
        escalatedAt: row.escalated_at,
        slaDeadline: row.sla_deadline,
        priority: row.priority,
        pullRequest: {
          id: row.pull_request_id,
          title: row.title,
          author: row.author,
          description: row.description,
          repository: row.repository,
          branch: row.branch,
          filesChanged: row.files_changed,
          additions: row.additions,
          deletions: row.deletions,
          labels: row.labels,
          priority: row.priority,
          createdAt: row.created_at,
          updatedAt: row.updated_at
        }
      };

      approvals.push(approval);
    }

    return approvals;
  }

  async getApproval(approvalId: string): Promise<Approval | null> {
    const { rows } = await this.db.query(
      `SELECT a.*, pr.*
       FROM approvals a
       JOIN pull_requests pr ON a.pull_request_id = pr.id
       WHERE a.id = $1`,
      [approvalId]
    );

    if (rows.length === 0) return null;

    const row = rows[0];
    const approval: Approval = {
      id: row.id,
      pullRequestId: row.pull_request_id,
      status: row.status,
      assignedReviewerId: row.assigned_reviewer_id,
      submittedAt: row.submitted_at,
      assignedAt: row.assigned_at,
      completedAt: row.completed_at,
      escalatedAt: row.escalated_at,
      slaDeadline: row.sla_deadline,
      priority: row.priority,
      pullRequest: {
        id: row.pull_request_id,
        title: row.title,
        author: row.author,
        description: row.description,
        repository: row.repository,
        branch: row.branch,
        filesChanged: row.files_changed,
        additions: row.additions,
        deletions: row.deletions,
        labels: row.labels,
        priority: row.priority,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }
    };

    if (row.assigned_reviewer_id) {
      approval.assignedReviewer = await this.getTeamMember(row.assigned_reviewer_id);
    }

    return approval;
  }

  private async getTeamMember(memberId: string): Promise<TeamMember | null> {
    const { rows } = await this.db.query(
      'SELECT * FROM team_members WHERE id = $1',
      [memberId]
    );

    if (rows.length === 0) return null;

    return rows[0] as TeamMember;
  }

  private async getTeamLead(): Promise<TeamMember | null> {
    const { rows } = await this.db.query(
      'SELECT * FROM team_members WHERE role = $1 AND is_active = true LIMIT 1',
      ['team_lead']
    );

    if (rows.length === 0) return null;

    return rows[0] as TeamMember;
  }

  private async getSLARule(priority: string): Promise<SLARule> {
    const { rows } = await this.db.query(
      'SELECT * FROM sla_rules WHERE priority = $1',
      [priority]
    );

    if (rows.length === 0) {
      return {
        priority: priority as any,
        targetHours: 8,
        escalationHours: 16,
        autoAssign: true,
        notifyOnOverdue: true
      };
    }

    return rows[0] as SLARule;
  }

  async getSLAStatus(): Promise<any> {
    const { rows } = await this.db.query(
      `SELECT
         COUNT(*) as total_pending,
         COUNT(*) FILTER (WHERE sla_deadline < NOW()) as overdue,
         COUNT(*) FILTER (WHERE sla_deadline < NOW() + INTERVAL '2 hours') as due_soon,
         COUNT(*) FILTER (WHERE status = 'escalated') as escalated
       FROM approvals
       WHERE status IN ('pending', 'in_review', 'escalated')`
    );

    return rows[0];
  }
}