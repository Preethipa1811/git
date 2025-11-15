import React, { useState } from 'react';
import {
  GitPullRequest,
  User,
  Clock,
  AlertTriangle,
  ExternalLink,
  ChevronUp,
  ChevronDown,
  CheckCircle,
  XCircle,
  ArrowUp
} from 'lucide-react';
import { Approval } from '../types';
import { approvalApi } from '../services/api';

interface ReviewCardProps {
  approval: Approval;
  onUpdate: () => void;
  slaStatus: {
    status: 'safe' | 'warning' | 'overdue';
    text: string;
  };
}

const ReviewCard: React.FC<ReviewCardProps> = ({ approval, onUpdate, slaStatus }) => {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleEscalate = async () => {
    if (!confirm('Are you sure you want to escalate this review?')) return;

    setLoading(true);
    try {
      await approvalApi.escalate(approval.id);
      onUpdate();
    } catch (error) {
      console.error('Failed to escalate:', error);
      alert('Failed to escalate review. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'high':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low':
        return 'text-gray-600 bg-gray-50 border-gray-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getSLAIndicator = () => {
    switch (slaStatus.status) {
      case 'safe':
        return 'sla-safe';
      case 'warning':
        return 'sla-warning';
      case 'overdue':
        return 'sla-overdue';
      default:
        return 'sla-safe';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const hoursAgo = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (hoursAgo < 1) {
      const minutesAgo = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      return `${minutesAgo}m ago`;
    } else if (hoursAgo < 24) {
      return `${hoursAgo}h ago`;
    } else {
      const daysAgo = Math.floor(hoursAgo / 24);
      return `${daysAgo}d ago`;
    }
  };

  return (
    <div className="card hover:shadow-md transition-shadow">
      <div className="card-body">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <GitPullRequest className="w-5 h-5 text-gray-500" />
              <h3 className="text-lg font-medium text-gray-900">
                {approval.pullRequest.title}
              </h3>
              <span className={`status-badge status-${approval.status}`}>
                {approval.status.replace('_', ' ')}
              </span>
              <span className={`px-2 py-1 text-xs font-medium border rounded ${getPriorityColor(approval.priority)}`}>
                {approval.priority}
              </span>
              <span className={`sla-indicator ${getSLAIndicator()}`}>
                <Clock className="w-3 h-3 mr-1" />
                {slaStatus.text}
              </span>
            </div>

            <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
              <span>by {approval.pullRequest.author}</span>
              <span>•</span>
              <span>{approval.pullRequest.repository}</span>
              <span>•</span>
              <span>{formatTimeAgo(approval.submittedAt)}</span>
              <span>•</span>
              <span>{approval.pullRequest.filesChanged} files</span>
              {approval.pullRequest.additions > 0 && (
                <>
                  <span>•</span>
                  <span className="text-green-600">+{approval.pullRequest.additions}</span>
                </>
              )}
              {approval.pullRequest.deletions > 0 && (
                <>
                  <span>•</span>
                  <span className="text-red-600">-{approval.pullRequest.deletions}</span>
                </>
              )}
            </div>

            {approval.assignedReviewer && (
              <div className="flex items-center space-x-2 text-sm">
                <User className="w-4 h-4 text-gray-500" />
                <span className="text-gray-600">Assigned to:</span>
                <span className="font-medium text-gray-900">
                  {approval.assignedReviewer.name}
                </span>
                <span className="text-gray-500">
                  ({approval.assignedReviewer.currentWorkload}/{approval.assignedReviewer.maxWorkload} active)
                </span>
              </div>
            )}

            {approval.pullRequest.labels.length > 0 && (
              <div className="flex items-center space-x-2 mt-2">
                <span className="text-xs text-gray-500">Labels:</span>
                <div className="flex flex-wrap gap-1">
                  {approval.pullRequest.labels.map((label, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded"
                    >
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2 ml-4">
            <a
              href={`https://github.com/${approval.pullRequest.repository}/pull/${approval.pullRequest.githubPrId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary btn-sm"
              title="Open in GitHub"
            >
              <ExternalLink className="w-4 h-4" />
            </a>

            {(approval.status === 'in_review' || approval.status === 'escalated') && (
              <button
                onClick={handleEscalate}
                disabled={loading}
                className="btn btn-warning btn-sm"
                title="Escalate to team lead"
              >
                <ArrowUp className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={() => setExpanded(!expanded)}
              className="btn btn-secondary btn-sm"
              title="Show details"
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {expanded && approval.pullRequest.description && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Description</h4>
            <div className="prose prose-sm max-w-none text-gray-700">
              {approval.pullRequest.description}
            </div>
          </div>
        )}

        {expanded && approval.assignedAt && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Submitted:</span>
                <div className="font-medium text-gray-900">
                  {new Date(approval.submittedAt).toLocaleString()}
                </div>
              </div>
              <div>
                <span className="text-gray-500">Assigned:</span>
                <div className="font-medium text-gray-900">
                  {new Date(approval.assignedAt).toLocaleString()}
                </div>
              </div>
              <div>
                <span className="text-gray-500">SLA Deadline:</span>
                <div className={`font-medium ${slaStatus.status === 'overdue' ? 'text-red-600' : 'text-gray-900'}`}>
                  {new Date(approval.slaDeadline).toLocaleString()}
                </div>
              </div>
              <div>
                <span className="text-gray-500">Priority:</span>
                <div className={`font-medium capitalize ${getPriorityColor(approval.priority)}`}>
                  {approval.priority}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewCard;