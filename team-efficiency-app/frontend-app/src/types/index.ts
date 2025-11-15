export interface PullRequest {
  id: string;
  title: string;
  author: string;
  description?: string;
  repository: string;
  branch: string;
  filesChanged: number;
  additions: number;
  deletions: number;
  labels: string[];
  priority: 'low' | 'medium' | 'high' | 'critical';
  githubPrId?: number;
  githubRepo?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Approval {
  id: string;
  pullRequestId: string;
  pullRequest: PullRequest;
  status: 'pending' | 'in_review' | 'approved' | 'rejected' | 'escalated';
  assignedReviewerId?: string;
  assignedReviewer?: TeamMember;
  submittedAt: string;
  assignedAt?: string;
  completedAt?: string;
  escalatedAt?: string;
  slaDeadline: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  githubUsername: string;
  isActive: boolean;
  isAvailable: boolean;
  expertise: string[];
  currentWorkload: number;
  maxWorkload: number;
  role: 'developer' | 'senior_developer' | 'team_lead';
  timezone: string;
}

export interface Metrics {
  teamId: string;
  averageReviewTime: number;
  approvalVelocity: number;
  bottlenecks: Bottleneck[];
  escalationRate: number;
  teamAvailability: number;
  timePeriod: 'day' | 'week' | 'month';
}

export interface Bottleneck {
  reviewerId: string;
  reviewerName: string;
  currentAssignments: number;
  averageTimeInQueue: number;
  escalations: number;
  severity: 'low' | 'medium' | 'high';
}

export interface Notification {
  id: string;
  userId: string;
  type: 'assignment' | 'overdue' | 'escalation' | 'completed';
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  data?: any;
}

export interface ReviewerMetrics {
  totalReviews: number;
  averageReviewTime: number;
  onTimeRate: number;
  escalatedCount: number;
  currentWorkload: number;
  timePeriod: 'day' | 'week' | 'month';
}

export interface TeamMetrics {
  totalPending: number;
  overdue: number;
  dueSoon: number;
  escalated: number;
}

export interface TrendData {
  timePeriod: string;
  approvalsCreated: number;
  approvalsCompleted: number;
  averageReviewTime: number;
  onTimeRate: number;
}