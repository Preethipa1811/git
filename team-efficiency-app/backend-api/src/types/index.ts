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
  createdAt: Date;
  updatedAt: Date;
}

export interface Approval {
  id: string;
  pullRequestId: string;
  pullRequest: PullRequest;
  status: 'pending' | 'in_review' | 'approved' | 'rejected' | 'escalated';
  assignedReviewerId?: string;
  assignedReviewer?: TeamMember;
  submittedAt: Date;
  assignedAt?: Date;
  completedAt?: Date;
  escalatedAt?: Date;
  slaDeadline: Date;
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

export interface Assignment {
  id: string;
  approvalId: string;
  reviewerId: string;
  assignedAt: Date;
  acceptedAt?: Date;
  declinedAt?: Date;
  completedAt?: Date;
  escalatedAt?: Date;
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
  reason: string;
  severity: 'low' | 'medium' | 'high';
  timestamp: Date;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'assignment' | 'overdue' | 'escalation' | 'completed';
  title: string;
  message: string;
  createdAt: Date;
  read: boolean;
  data?: any;
}

export interface SLARule {
  priority: 'low' | 'medium' | 'high' | 'critical';
  targetHours: number;
  escalationHours: number;
  autoAssign: boolean;
  notifyOnOverdue: boolean;
}