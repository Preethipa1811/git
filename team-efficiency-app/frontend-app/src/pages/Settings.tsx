import React, { useState, useEffect } from 'react';
import { Settings, Clock, AlertTriangle, Save } from 'lucide-react';

const SettingsPage: React.FC = () => {
  const [slaRules, setSlaRules] = useState<any[]>([]);
  const [teamSettings, setTeamSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettingsData();
  }, []);

  const loadSettingsData = async () => {
    try {
      // Mock data for now
      setSlaRules([
        { priority: 'critical', targetHours: 1, escalationHours: 2, autoAssign: true, notifyOnOverdue: true },
        { priority: 'high', targetHours: 4, escalationHours: 8, autoAssign: true, notifyOnOverdue: true },
        { priority: 'medium', targetHours: 8, escalationHours: 16, autoAssign: true, notifyOnOverdue: true },
        { priority: 'low', targetHours: 24, escalationHours: 48, autoAssign: true, notifyOnOverdue: true }
      ]);

      setTeamSettings({
        maxWorkloadPerReviewer: 3,
        autoAssignmentEnabled: true,
        escalationEnabled: true,
        notificationEmails: ['team-lead@example.com'],
        workingHours: { start: '09:00', end: '17:00' },
        timezone: 'UTC'
      });
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSLARule = async (priority: string, updates: any) => {
    try {
      setSaving(true);
      // await settingsApi.updateSLARule(ruleId, updates);
      setSlaRules(prev =>
        prev.map(rule =>
          rule.priority === priority ? { ...rule, ...updates } : rule
        )
      );
    } catch (error) {
      console.error('Failed to update SLA rule:', error);
      alert('Failed to update SLA rule');
    } finally {
      setSaving(false);
    }
  };

  const updateTeamSettings = async (updates: any) => {
    try {
      setSaving(true);
      // await settingsApi.updateTeamSettings(updates);
      setTeamSettings(prev => ({ ...prev, ...updates }));
    } catch (error) {
      console.error('Failed to update team settings:', error);
      alert('Failed to update team settings');
    } finally {
      setSaving(false);
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
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Configure SLA rules and team preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SLA Rules */}
        <div className="card">
          <div className="card-header">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-gray-600" />
              <h3 className="card-title">SLA Rules</h3>
            </div>
          </div>
          <div className="card-body">
            <div className="space-y-4">
              {slaRules.map((rule) => (
                <div key={rule.priority} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-gray-900 capitalize">{rule.priority} Priority</h4>
                    <span className={`px-2 py-1 text-xs font-medium rounded ${
                      rule.priority === 'critical' ? 'bg-red-100 text-red-700' :
                      rule.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                      rule.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {rule.targetHours}h target
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="form-label">Target Hours</label>
                      <input
                        type="number"
                        min="1"
                        max="168"
                        value={rule.targetHours}
                        onChange={(e) => updateSLARule(rule.priority, { targetHours: parseInt(e.target.value) })}
                        className="form-input"
                      />
                    </div>
                    <div>
                      <label className="form-label">Escalation Hours</label>
                      <input
                        type="number"
                        min="1"
                        max="168"
                        value={rule.escalationHours}
                        onChange={(e) => updateSLARule(rule.priority, { escalationHours: parseInt(e.target.value) })}
                        className="form-input"
                      />
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={rule.autoAssign}
                        onChange={(e) => updateSLARule(rule.priority, { autoAssign: e.target.checked })}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm text-gray-700">Auto-assign reviewer</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={rule.notifyOnOverdue}
                        onChange={(e) => updateSLARule(rule.priority, { notifyOnOverdue: e.target.checked })}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm text-gray-700">Notify on overdue</span>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Team Settings */}
        <div className="card">
          <div className="card-header">
            <div className="flex items-center space-x-2">
              <Settings className="w-5 h-5 text-gray-600" />
              <h3 className="card-title">Team Settings</h3>
            </div>
          </div>
          <div className="card-body">
            {teamSettings && (
              <div className="space-y-6">
                <div>
                  <label className="form-label">Max Workload per Reviewer</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={teamSettings.maxWorkloadPerReviewer}
                    onChange={(e) => updateTeamSettings({ maxWorkloadPerReviewer: parseInt(e.target.value) })}
                    className="form-input"
                  />
                  <p className="text-sm text-gray-500 mt-1">Maximum concurrent reviews per team member</p>
                </div>

                <div>
                  <label className="form-label">Working Hours</label>
                  <div className="grid grid-cols-2 gap-4">
                    <input
                      type="time"
                      value={teamSettings.workingHours.start}
                      onChange={(e) => updateTeamSettings({
                        workingHours: { ...teamSettings.workingHours, start: e.target.value }
                      })}
                      className="form-input"
                    />
                    <input
                      type="time"
                      value={teamSettings.workingHours.end}
                      onChange={(e) => updateTeamSettings({
                        workingHours: { ...teamSettings.workingHours, end: e.target.value }
                      })}
                      className="form-input"
                    />
                  </div>
                  <p className="text-sm text-gray-500 mt-1">Business hours for SLA calculations</p>
                </div>

                <div>
                  <label className="form-label">Notification Emails</label>
                  <textarea
                    value={teamSettings.notificationEmails.join('\n')}
                    onChange={(e) => updateTeamSettings({
                      notificationEmails: e.target.value.split('\n').filter(email => email.trim())
                    })}
                    className="form-input"
                    rows={3}
                    placeholder="team-lead@example.com&#10;manager@example.com"
                  />
                  <p className="text-sm text-gray-500 mt-1">One email per line for escalation notifications</p>
                </div>

                <div className="space-y-3">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={teamSettings.autoAssignmentEnabled}
                      onChange={(e) => updateTeamSettings({ autoAssignmentEnabled: e.target.checked })}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-700">Enable automatic reviewer assignment</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={teamSettings.escalationEnabled}
                      onChange={(e) => updateTeamSettings({ escalationEnabled: e.target.checked })}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-700">Enable automatic escalations</span>
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-6 flex justify-end space-x-4">
        <button className="btn btn-secondary">
          Reset to Defaults
        </button>
        <button className="btn btn-primary" disabled={saving}>
          {saving ? (
            <>
              <div className="loading-spinner mr-2" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default SettingsPage;