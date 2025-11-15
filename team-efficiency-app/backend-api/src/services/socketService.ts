import { Server as SocketIOServer } from 'socket.io';
import { Pool } from 'pg';

interface ConnectedUser {
  userId: string;
  socketId: string;
  name: string;
  role: string;
}

export class SocketService {
  private io: SocketIOServer;
  private db: Pool;
  private connectedUsers: Map<string, ConnectedUser> = new Map();

  constructor(io: SocketIOServer, db: Pool) {
    this.io = io;
    this.db = db;
  }

  initialize(): void {
    this.io.on('connection', (socket) => {
      console.log(`User connected: ${socket.id}`);

      socket.on('authenticate', async (data) => {
        try {
          const { userId, token } = data;

          const { rows } = await this.db.query(
            'SELECT id, name, email, role FROM team_members WHERE id = $1 AND is_active = true',
            [userId]
          );

          if (rows.length === 0) {
            socket.emit('authentication_error', { message: 'Invalid user' });
            return;
          }

          const user = rows[0];
          const connectedUser: ConnectedUser = {
            userId: user.id,
            socketId: socket.id,
            name: user.name,
            role: user.role
          };

          this.connectedUsers.set(userId, connectedUser);
          socket.join(`user_${userId}`);
          socket.join(`role_${user.role}`);

          socket.emit('authenticated', { user: connectedUser });
          this.broadcastTeamStatus();

          console.log(`User authenticated: ${user.name} (${user.id})`);
        } catch (error) {
          console.error('Authentication error:', error);
          socket.emit('authentication_error', { message: 'Authentication failed' });
        }
      });

      socket.on('join_approval_room', (approvalId) => {
        socket.join(`approval_${approvalId}`);
      });

      socket.on('leave_approval_room', (approvalId) => {
        socket.leave(`approval_${approvalId}`);
      });

      socket.on('subscribe_notifications', (userId) => {
        socket.join(`notifications_${userId}`);
      });

      socket.on('mark_online', (data) => {
        const connectedUser = this.connectedUsers.get(data.userId);
        if (connectedUser) {
          this.broadcastTeamStatus();
        }
      });

      socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);

        for (const [userId, user] of this.connectedUsers.entries()) {
          if (user.socketId === socket.id) {
            this.connectedUsers.delete(userId);
            this.broadcastTeamStatus();
            break;
          }
        }
      });
    });
  }

  broadcastNewApproval(approval: any): void {
    this.io.emit('approval_created', {
      type: 'approval_created',
      data: approval,
      timestamp: new Date()
    });

    if (approval.assignedReviewerId) {
      this.io.to(`user_${approval.assignedReviewerId}`).emit('new_assignment', {
        type: 'new_assignment',
        data: approval,
        timestamp: new Date()
      });
    }
  }

  broadcastApprovalUpdated(approval: any): void {
    this.io.to(`approval_${approval.id}`).emit('approval_updated', {
      type: 'approval_updated',
      data: approval,
      timestamp: new Date()
    });

    if (approval.assignedReviewerId) {
      this.io.to(`user_${approval.assignedReviewerId}`).emit('assignment_updated', {
        type: 'assignment_updated',
        data: approval,
        timestamp: new Date()
      });
    }

    this.io.emit('queue_updated', {
      type: 'queue_updated',
      timestamp: new Date()
    });
  }

  broadcastApprovalCompleted(approval: any): void {
    this.io.to(`approval_${approval.id}`).emit('approval_completed', {
      type: 'approval_completed',
      data: approval,
      timestamp: new Date()
    });

    this.io.to(`notifications_${approval.pullRequest.author}`).emit('review_completed', {
      type: 'review_completed',
      data: approval,
      timestamp: new Date()
    });

    this.io.emit('queue_updated', {
      type: 'queue_updated',
      timestamp: new Date()
    });
  }

  broadcastEscalation(approval: any): void {
    this.io.to(`approval_${approval.id}`).emit('approval_escalated', {
      type: 'approval_escalated',
      data: approval,
      timestamp: new Date()
    });

    this.io.to('role_team_lead').emit('escalation_alert', {
      type: 'escalation_alert',
      data: approval,
      timestamp: new Date()
    });

    this.io.emit('queue_updated', {
      type: 'queue_updated',
      timestamp: new Date()
    });
  }

  broadcastNotification(userId: string, notification: any): void {
    this.io.to(`notifications_${userId}`).emit('notification', {
      type: 'notification',
      data: notification,
      timestamp: new Date()
    });
  }

  broadcastTeamStatus(): void {
    const onlineUsers = Array.from(this.connectedUsers.values()).map(user => ({
      userId: user.userId,
      name: user.name,
      role: user.role,
      isOnline: true
    }));

    this.io.emit('team_status_updated', {
      type: 'team_status_updated',
      data: {
        onlineUsers,
        totalOnline: onlineUsers.length
      },
      timestamp: new Date()
    });
  }

  broadcastSLAWarning(approval: any): void {
    if (approval.assignedReviewerId) {
      this.io.to(`user_${approval.assignedReviewerId}`).emit('sla_warning', {
        type: 'sla_warning',
        data: {
          approvalId: approval.id,
          slaDeadline: approval.slaDeadline,
          priority: approval.priority,
          timeRemaining: new Date(approval.slaDeadline).getTime() - Date.now()
        },
        timestamp: new Date()
      });
    }
  }

  broadcastBottleneckAlert(bottlenecks: any[]): void {
    this.io.to('role_team_lead').emit('bottleneck_alert', {
      type: 'bottleneck_alert',
      data: bottlenecks,
      timestamp: new Date()
    });
  }

  broadcastMetricsUpdate(metrics: any): void {
    this.io.emit('metrics_updated', {
      type: 'metrics_updated',
      data: metrics,
      timestamp: new Date()
    });
  }

  getConnectedUsers(): ConnectedUser[] {
    return Array.from(this.connectedUsers.values());
  }

  isUserOnline(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }

  getUsersByRole(role: string): ConnectedUser[] {
    return Array.from(this.connectedUsers.values())
      .filter(user => user.role === role);
  }
}

let socketService: SocketService;

export const initializeSocket = (io: SocketIOServer) => {
  const db = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  socketService = new SocketService(io, db);
  socketService.initialize();
};

export const getSocketService = (): SocketService => {
  if (!socketService) {
    throw new Error('Socket service not initialized');
  }
  return socketService;
};