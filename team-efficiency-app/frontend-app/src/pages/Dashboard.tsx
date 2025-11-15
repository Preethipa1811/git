import React, { useState, useEffect } from 'react';
import { Clock, User, AlertTriangle, CheckCircle, GitPullRequest, ExternalLink } from 'lucide-react';
import { Approval, TeamMetrics } from '../types';
import { approvalApi } from '../services/api';
import ReviewCard from '../components/ReviewCard';

const Dashboard: React.FC = () => {
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [teamMetrics, setTeamMetrics] = useState<TeamMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'in_review' | 'escalated'>('all');

  useEffect(() => {
    loadDashboardData();

    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      const [approvalsData, metricsData] = await Promise.all([
        approvalApi.getQueue(),
        approvalApi.getSLAStatus()
      ]);

      setApprovals(approvalsData);
      setTeamMetrics(metricsData);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredApprovals = approvals.filter(approval => {
    if (filter === 'all') return true;
    return approval.status === filter;
  });

  const getSLAStatus = (deadline: string) => {
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const hoursUntilDeadline = (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntilDeadline < 0) {
      return { status: 'overdue', text: `Overdue by ${Math.abs(Math.floor(hoursUntilDeadline))}h` };
    } else if (hoursUntilDeadline < 2) {
      return { status: 'warning', text: `Due in ${Math.ceil(hoursUntilDeadline)}h` };
    } else {
      return { status: 'safe', text: `${Math.floor(hoursUntilDeadline)}h remaining` };
    }
  };

  if (loading) {
    return (
      <div className="container">
        <div className="page-header">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="page-header">
        <h1 className="page-title">Approval Queue</h1>
        <p className="page-subtitle">Monitor and manage code review approvals</p>
      </div>

      {/* Team Metrics Cards */}
      {teamMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="card">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Pending</p>
                  <p className="text-2xl font-bold text-gray-900">{teamMetrics.totalPending}</p>
                </div>
                <Clock className="w-8 h-8 text-blue-500" />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Overdue</p>
                  <p className="text-2xl font-bold text-red-600">{teamMetrics.overdue}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Due Soon</p>
                  <p className="text-2xl font-bold text-yellow-600">{teamMetrics.dueSoon}</p>
                </div>
                <Clock className="w-8 h-8 text-yellow-500" />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Escalated</p>
                  <p className="text-2xl font-bold text-orange-600">{teamMetrics.escalated}</p>
                </div>
                <User className="w-8 h-8 text-orange-500" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="card mb-6">
        <div className="card-header">
          <div className="flex items-center justify-between">
            <div className="flex space-x-4">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 text-sm font-medium rounded-md ${
                  filter === 'all'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                All ({approvals.length})
              </button>
              <button
                onClick={() => setFilter('pending')}
                className={`px-4 py-2 text-sm font-medium rounded-md ${
                  filter === 'pending'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Pending ({approvals.filter(a => a.status === 'pending').length})
              </button>
              <button
                onClick={() => setFilter('in_review')}
                className={`px-4 py-2 text-sm font-medium rounded-md ${
                  filter === 'in_review'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                In Review ({approvals.filter(a => a.status === 'in_review').length})
              </button>
              <button
                onClick={() => setFilter('escalated')}
                className={`px-4 py-2 text-sm font-medium rounded-md ${
                  filter === 'escalated'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Escalated ({approvals.filter(a => a.status === 'escalated').length})
              </button>
            </div>
            <button className="btn btn-secondary btn-sm">
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Approval Queue */}
      <div className="space-y-4">
        {filteredApprovals.length === 0 ? (
          <div className="card">
            <div className="card-body text-center py-8">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">All caught up!</h3>
              <p className="text-gray-600">
                No {filter === 'all' ? '' : filter} approvals to review at the moment.
              </p>
            </div>
          </div>
        ) : (
          filteredApprovals.map(approval => (
            <ReviewCard
              key={approval.id}
              approval={approval}
              onUpdate={loadDashboardData}
              slaStatus={getSLAStatus(approval.slaDeadline)}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default Dashboard;