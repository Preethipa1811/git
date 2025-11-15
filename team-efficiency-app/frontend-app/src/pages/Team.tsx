import React, { useState, useEffect } from 'react';
import { Users, Circle, AlertCircle, CheckCircle } from 'lucide-react';

const Team: React.FC = () => {
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTeamData();
    const interval = setInterval(loadTeamData, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadTeamData = async () => {
    try {
      // Mock data for now
      setTeamMembers([
        {
          id: '1',
          name: 'John Doe',
          email: 'john@example.com',
          role: 'team_lead',
          isAvailable: true,
          currentWorkload: 2,
          maxWorkload: 3,
          expertise: ['frontend', 'react']
        },
        {
          id: '2',
          name: 'Jane Smith',
          email: 'jane@example.com',
          role: 'senior_developer',
          isAvailable: true,
          currentWorkload: 1,
          maxWorkload: 3,
          expertise: ['backend', 'api']
        },
        {
          id: '3',
          name: 'Bob Johnson',
          email: 'bob@example.com',
          role: 'developer',
          isAvailable: false,
          currentWorkload: 3,
          maxWorkload: 3,
          expertise: ['database', 'sql']
        }
      ]);
    } catch (error) {
      console.error('Failed to load team data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleAvailability = async (memberId: string, isAvailable: boolean) => {
    try {
      // await teamApi.updateAvailability(memberId, isAvailable);
      setTeamMembers(prev =>
        prev.map(member =>
          member.id === memberId ? { ...member, isAvailable } : member
        )
      );
    } catch (error) {
      console.error('Failed to update availability:', error);
    }
  };

  const getWorkloadColor = (current: number, max: number) => {
    const ratio = current / max;
    if (ratio >= 1) return 'text-red-600 bg-red-50';
    if (ratio >= 0.75) return 'text-yellow-600 bg-yellow-50';
    return 'text-green-600 bg-green-50';
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'team_lead': return 'bg-purple-100 text-purple-700';
      case 'senior_developer': return 'bg-blue-100 text-blue-700';
      case 'developer': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
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
        <h1 className="page-title">Team</h1>
        <p className="page-subtitle">Manage team members and availability</p>
      </div>

      {/* Team Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="card">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Members</p>
                <p className="text-2xl font-bold text-gray-900">{teamMembers.length}</p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Available</p>
                <p className="text-2xl font-bold text-green-600">
                  {teamMembers.filter(m => m.isAvailable).length}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Busy</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {teamMembers.filter(m => m.currentWorkload >= m.maxWorkload).length}
                </p>
              </div>
              <AlertCircle className="w-8 h-8 text-yellow-500" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Offline</p>
                <p className="text-2xl font-bold text-gray-600">
                  {teamMembers.filter(m => !m.isAvailable).length}
                </p>
              </div>
              <Circle className="w-8 h-8 text-gray-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Team Members List */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Team Members</h3>
        </div>
        <div className="card-body">
          <div className="space-y-4">
            {teamMembers.map((member) => (
              <div key={member.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium">
                      {member.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                      member.isAvailable ? 'bg-green-500' : 'bg-gray-400'
                    }`}></div>
                  </div>

                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="text-lg font-medium text-gray-900">{member.name}</h4>
                      <span className={`px-2 py-1 text-xs font-medium rounded ${getRoleBadgeColor(member.role)}`}>
                        {member.role.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{member.email}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-xs text-gray-500">Expertise:</span>
                      <div className="flex flex-wrap gap-1">
                        {member.expertise.map((skill: string, index: number) => (
                          <span key={index} className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">Workload</p>
                    <div className={`inline-flex items-center px-2 py-1 rounded-full text-sm font-medium ${getWorkloadColor(member.currentWorkload, member.maxWorkload)}`}>
                      {member.currentWorkload}/{member.maxWorkload}
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">Status</p>
                    <button
                      onClick={() => toggleAvailability(member.id, !member.isAvailable)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        member.isAvailable ? 'bg-green-600' : 'bg-gray-200'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        member.isAvailable ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Team;