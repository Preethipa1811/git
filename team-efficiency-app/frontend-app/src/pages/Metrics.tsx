import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Clock, AlertTriangle } from 'lucide-react';
import { metricsApi } from '../services/api';

const Metrics: React.FC = () => {
  const [metrics, setMetrics] = useState<any>(null);
  const [trends, setTrends] = useState<any[]>([]);
  const [bottlenecks, setBottlenecks] = useState<any[]>([]);
  const [timePeriod, setTimePeriod] = useState<'day' | 'week' | 'month'>('week');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMetricsData();
  }, [timePeriod]);

  const loadMetricsData = async () => {
    try {
      setLoading(true);
      const [metricsData, trendsData, bottlenecksData] = await Promise.all([
        metricsApi.getTeamMetrics(timePeriod),
        metricsApi.getTrends(timePeriod),
        metricsApi.getBottlenecks(timePeriod)
      ]);

      setMetrics(metricsData);
      setTrends(trendsData);
      setBottlenecks(bottlenecksData);
    } catch (error) {
      console.error('Failed to load metrics:', error);
    } finally {
      setLoading(false);
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">Team Metrics</h1>
            <p className="page-subtitle">Monitor team performance and identify bottlenecks</p>
          </div>
          <select
            value={timePeriod}
            onChange={(e) => setTimePeriod(e.target.value as 'day' | 'week' | 'month')}
            className="form-select w-auto"
          >
            <option value="day">Last 24 Hours</option>
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
          </select>
        </div>
      </div>

      {/* Key Metrics Cards */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="card">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg Review Time</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {metrics.averageReviewTime.toFixed(1)}h
                  </p>
                </div>
                <Clock className="w-8 h-8 text-blue-500" />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Approval Velocity</p>
                  <p className="text-2xl font-bold text-green-600">{metrics.approvalVelocity}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-500" />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Escalation Rate</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {metrics.escalationRate.toFixed(1)}%
                  </p>
                </div>
                <AlertTriangle className="w-8 h-8 text-orange-500" />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Team Availability</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {metrics.teamAvailability.toFixed(0)}%
                  </p>
                </div>
                <BarChart3 className="w-8 h-8 text-purple-500" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Charts and Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Trends Chart */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Approval Trends</h3>
          </div>
          <div className="card-body">
            <div className="h-64 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <BarChart3 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>Chart visualization coming soon</p>
                <p className="text-sm text-gray-400 mt-1">
                  {trends.length} data points available
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottlenecks */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Current Bottlenecks</h3>
          </div>
          <div className="card-body">
            {bottlenecks.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <p className="text-gray-600">No bottlenecks detected</p>
              </div>
            ) : (
              <div className="space-y-3">
                {bottlenecks.map((bottleneck, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{bottleneck.reviewerName}</p>
                      <p className="text-sm text-gray-600">
                        {bottleneck.currentAssignments} assignments • {bottleneck.averageTimeInQueue.toFixed(1)}h avg wait
                      </p>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded ${
                      bottleneck.severity === 'high' ? 'bg-red-100 text-red-700' :
                      bottleneck.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {bottleneck.severity}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Recent Activity</h3>
        </div>
        <div className="card-body">
          <div className="space-y-4">
            {trends.slice(0, 5).map((trend, index) => (
              <div key={index} className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">
                    {new Date(trend.timePeriod).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-gray-600">
                    {trend.approvalsCreated} created, {trend.approvalsCompleted} completed
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {trend.averageReviewTime.toFixed(1)}h avg time
                  </p>
                  <p className="text-sm text-green-600">
                    {trend.onTimeRate.toFixed(0)}% on time
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Metrics;