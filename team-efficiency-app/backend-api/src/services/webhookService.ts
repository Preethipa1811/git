import axios from 'axios';
import { PullRequest } from '../types';

export interface GitHubWebhookPayload {
  action: string;
  pull_request: {
    id: number;
    title: string;
    body?: string;
    user: {
      login: string;
    };
    base: {
      repo: {
        name: string;
        full_name: string;
      };
      ref: string;
    };
    head: {
      ref: string;
    };
    changed_files?: number;
    additions?: number;
    deletions?: number;
    labels: Array<{
      name: string;
    }>;
    created_at: string;
    updated_at: string;
    state: string;
    merged_at?: string;
    closed_at?: string;
  };
  repository: {
    name: string;
    full_name: string;
  };
}

export class WebhookService {
  private githubToken: string;
  private webhookSecret: string;

  constructor(githubToken: string, webhookSecret: string) {
    this.githubToken = githubToken;
    this.webhookSecret = webhookSecret;
  }

  async handlePROpened(payload: GitHubWebhookPayload): Promise<PullRequest> {
    const prData = payload.pull_request;
    const repoData = payload.repository;

    const pullRequest: PullRequest = {
      id: `github_${prData.id}`,
      title: prData.title,
      author: prData.user.login,
      description: prData.body,
      repository: repoData.full_name,
      branch: prData.head.ref,
      filesChanged: prData.changed_files || 0,
      additions: prData.additions || 0,
      deletions: prData.deletions || 0,
      labels: prData.labels.map(label => label.name),
      priority: this.determinePriority(prData.labels.map(label => label.name)),
      githubPrId: prData.id,
      githubRepo: repoData.full_name,
      createdAt: new Date(prData.created_at),
      updatedAt: new Date(prData.updated_at)
    };

    return pullRequest;
  }

  async handlePRClosed(payload: GitHubWebhookPayload): Promise<{ githubPrId: number; githubRepo: string }> {
    const prData = payload.pull_request;
    const repoData = payload.repository;

    return {
      githubPrId: prData.id,
      githubRepo: repoData.full_name
    };
  }

  async handlePRUpdated(payload: GitHubWebhookPayload): Promise<PullRequest> {
    return this.handlePROpened(payload);
  }

  private determinePriority(labels: string[]): 'low' | 'medium' | 'high' | 'critical' {
    const normalizedLabels = labels.map(label => label.toLowerCase());

    if (normalizedLabels.some(label =>
      label.includes('critical') ||
      label.includes('hotfix') ||
      label.includes('urgent') ||
      label.includes('security')
    )) {
      return 'critical';
    }

    if (normalizedLabels.some(label =>
      label.includes('high') ||
      label.includes('important') ||
      label.includes('breaking')
    )) {
      return 'high';
    }

    if (normalizedLabels.some(label =>
      label.includes('low') ||
      label.includes('minor') ||
      label.includes('documentation')
    )) {
      return 'low';
    }

    return 'medium';
  }

  async fetchPRDetails(repoFullName: string, prNumber: number): Promise<any> {
    try {
      const response = await axios.get(
        `https://api.github.com/repos/${repoFullName}/pulls/${prNumber}`,
        {
          headers: {
            'Authorization': `token ${this.githubToken}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error(`Failed to fetch PR details for ${repoFullName}#${prNumber}:`, error);
      throw error;
    }
  }

  async fetchPRFiles(repoFullName: string, prNumber: number): Promise<any[]> {
    try {
      const response = await axios.get(
        `https://api.github.com/repos/${repoFullName}/pulls/${prNumber}/files`,
        {
          headers: {
            'Authorization': `token ${this.githubToken}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error(`Failed to fetch PR files for ${repoFullName}#${prNumber}:`, error);
      return [];
    }
  }

  async postPRComment(repoFullName: string, prNumber: number, comment: string): Promise<void> {
    try {
      await axios.post(
        `https://api.github.com/repos/${repoFullName}/issues/${prNumber}/comments`,
        { body: comment },
        {
          headers: {
            'Authorization': `token ${this.githubToken}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        }
      );
    } catch (error) {
      console.error(`Failed to post comment to ${repoFullName}#${prNumber}:`, error);
      throw error;
    }
  }

  async updatePRStatus(repoFullName: string, sha: string, status: 'pending' | 'success' | 'failure', description: string): Promise<void> {
    try {
      await axios.post(
        `https://api.github.com/repos/${repoFullName}/statuses/${sha}`,
        {
          state: status,
          description: description,
          context: 'team-efficiency/approval'
        },
        {
          headers: {
            'Authorization': `token ${this.githubToken}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        }
      );
    } catch (error) {
      console.error(`Failed to update PR status for ${repoFullName}#${sha}:`, error);
      throw error;
    }
  }

  validateWebhookSignature(payload: string, signature: string): boolean {
    const crypto = require('crypto');
    const hmac = crypto.createHmac('sha256', this.webhookSecret);
    const digest = 'sha256=' + hmac.update(payload).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
  }

  async getTeamMemberFromGitHub(username: string): Promise<any> {
    try {
      const response = await axios.get(
        `https://api.github.com/users/${username}`,
        {
          headers: {
            'Authorization': `token ${this.githubToken}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error(`Failed to fetch GitHub user ${username}:`, error);
      return null;
    }
  }
}