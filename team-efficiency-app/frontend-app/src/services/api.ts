import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

export const approvalApi = {
  getQueue: async (): Promise<any[]> => {
    const response = await api.get<ApiResponse<any[]>>('/approvals/queue');
    return response.data.data;
  },

  assignReviewer: async (approvalId: string, reviewerId?: string): Promise<any> => {
    const response = await api.post<ApiResponse<any>>('/approvals/assign', {
      approvalId,
      reviewerId,
    });
    return response.data.data;
  },

  escalate: async (approvalId: string): Promise<any> => {
    const response = await api.post<ApiResponse<any>>(`/approvals/escalate/${approvalId}`);
    return response.data.data;
  },

  getMyAssignments: async (reviewerId: string): Promise<any[]> => {
    const response = await api.get<ApiResponse<any[]>>(`/approvals/my-assignments/${reviewerId}`);
    return response.data.data;
  },

  completeReview: async (approvalId: string, approved: boolean, feedback?: string): Promise<any> => {
    const response = await api.post<ApiResponse<any>>(`/approvals/complete/${approvalId}`, {
      approved,
      feedback,
    });
    return response.data.data;
  },

  getSLAStatus: async (): Promise<any> => {
    const response = await api.get<ApiResponse<any>>('/approvals/sla-status');
    return response.data.data;
  },
};

export const metricsApi = {
  getTeamMetrics: async (timePeriod: 'day' | 'week' | 'month' = 'week'): Promise<any> => {
    const response = await api.get<ApiResponse<any>>('/metrics/team', {
      params: { timePeriod },
    });
    return response.data.data;
  },

  getReviewerMetrics: async (reviewerId: string, timePeriod: 'day' | 'week' | 'month' = 'week'): Promise<any> => {
    const response = await api.get<ApiResponse<any>>(`/metrics/reviewer/${reviewerId}`, {
      params: { timePeriod },
    });
    return response.data.data;
  },

  getBottlenecks: async (timePeriod: 'day' | 'week' | 'month' = 'week'): Promise<any[]> => {
    const response = await api.get<ApiResponse<any[]>>('/metrics/bottlenecks', {
      params: { timePeriod },
    });
    return response.data.data;
  },

  getTrends: async (timePeriod: 'day' | 'week' | 'month' = 'week'): Promise<any[]> => {
    const response = await api.get<ApiResponse<any[]>>('/metrics/trends', {
      params: { timePeriod },
    });
    return response.data.data;
  },

  getApprovalDistribution: async (): Promise<any[]> => {
    const response = await api.get<ApiResponse<any[]>>('/metrics/approval-distribution');
    return response.data.data;
  },

  getTeamEfficiency: async (): Promise<any> => {
    const response = await api.get<ApiResponse<any>>('/metrics/team-efficiency');
    return response.data.data;
  },
};

export const teamApi = {
  getTeamMembers: async (): Promise<any[]> => {
    const response = await api.get<ApiResponse<any[]>>('/team/members');
    return response.data.data;
  },

  updateTeamMember: async (memberId: string, updates: any): Promise<any> => {
    const response = await api.put<ApiResponse<any>>(`/team/members/${memberId}`, updates);
    return response.data.data;
  },

  updateAvailability: async (memberId: string, isAvailable: boolean): Promise<any> => {
    const response = await api.put<ApiResponse<any>>(`/team/members/${memberId}/availability`, {
      isAvailable,
    });
    return response.data.data;
  },

  getTeamStatus: async (): Promise<any> => {
    const response = await api.get<ApiResponse<any>>('/team/status');
    return response.data.data;
  },
};

export const notificationApi = {
  getNotifications: async (unreadOnly = false): Promise<any[]> => {
    const response = await api.get<ApiResponse<any[]>>('/notifications', {
      params: { unreadOnly },
    });
    return response.data.data;
  },

  markAsRead: async (notificationId: string): Promise<void> => {
    await api.put(`/notifications/${notificationId}/read`);
  },

  markAllAsRead: async (): Promise<void> => {
    await api.put('/notifications/read-all');
  },
};

export const settingsApi = {
  getSLARules: async (): Promise<any[]> => {
    const response = await api.get<ApiResponse<any[]>>('/settings/sla-rules');
    return response.data.data;
  },

  updateSLARule: async (ruleId: string, updates: any): Promise<any> => {
    const response = await api.put<ApiResponse<any>>(`/settings/sla-rules/${ruleId}`, updates);
    return response.data.data;
  },

  getTeamSettings: async (): Promise<any> => {
    const response = await api.get<ApiResponse<any>>('/settings/team');
    return response.data.data;
  },

  updateTeamSettings: async (settings: any): Promise<any> => {
    const response = await api.put<ApiResponse<any>>('/settings/team', settings);
    return response.data.data;
  },
};

export default api;