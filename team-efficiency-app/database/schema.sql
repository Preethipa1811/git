-- Team Members
CREATE TABLE team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    github_username VARCHAR(255) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    is_available BOOLEAN DEFAULT true,
    expertise TEXT[] DEFAULT '{}',
    current_workload INTEGER DEFAULT 0,
    max_workload INTEGER DEFAULT 3,
    role VARCHAR(50) DEFAULT 'developer',
    timezone VARCHAR(50) DEFAULT 'UTC',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Pull Requests
CREATE TABLE pull_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(500) NOT NULL,
    author VARCHAR(255) NOT NULL,
    description TEXT,
    repository VARCHAR(255) NOT NULL,
    branch VARCHAR(255) NOT NULL,
    files_changed INTEGER DEFAULT 0,
    additions INTEGER DEFAULT 0,
    deletions INTEGER DEFAULT 0,
    labels TEXT[] DEFAULT '{}',
    priority VARCHAR(20) DEFAULT 'medium',
    github_pr_id INTEGER UNIQUE,
    github_repo VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Approvals
CREATE TABLE approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pull_request_id UUID NOT NULL REFERENCES pull_requests(id),
    status VARCHAR(20) DEFAULT 'pending',
    assigned_reviewer_id UUID REFERENCES team_members(id),
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_at TIMESTAMP,
    completed_at TIMESTAMP,
    escalated_at TIMESTAMP,
    sla_deadline TIMESTAMP NOT NULL,
    priority VARCHAR(20) DEFAULT 'medium',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Assignments
CREATE TABLE assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    approval_id UUID NOT NULL REFERENCES approvals(id),
    reviewer_id UUID NOT NULL REFERENCES team_members(id),
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    accepted_at TIMESTAMP,
    declined_at TIMESTAMP,
    completed_at TIMESTAMP,
    escalated_at TIMESTAMP
);

-- Notifications
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES team_members(id),
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP,
    data JSONB
);

-- Metrics Storage
CREATE TABLE metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID DEFAULT '00000000-0000-0000-0000-000000000000',
    average_review_time DECIMAL(10,2),
    approval_velocity DECIMAL(10,2),
    escalation_rate DECIMAL(5,2),
    team_availability DECIMAL(5,2),
    time_period VARCHAR(20) NOT NULL,
    period_start TIMESTAMP NOT NULL,
    period_end TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- SLA Rules
CREATE TABLE sla_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    priority VARCHAR(20) UNIQUE NOT NULL,
    target_hours INTEGER NOT NULL,
    escalation_hours INTEGER NOT NULL,
    auto_assign BOOLEAN DEFAULT true,
    notify_on_overdue BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_approvals_status ON approvals(status);
CREATE INDEX idx_approvals_assigned_reviewer ON approvals(assigned_reviewer_id);
CREATE INDEX idx_approvals_sla_deadline ON approvals(sla_deadline);
CREATE INDEX idx_assignments_reviewer_id ON assignments(reviewer_id);
CREATE INDEX idx_assignments_status ON assignments(assigned_at, completed_at);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read_at ON notifications(read_at);
CREATE INDEX idx_pull_requests_author ON pull_requests(author);
CREATE INDEX idx_team_members_is_active ON team_members(is_active);
CREATE INDEX idx_team_members_is_available ON team_members(is_available);

-- Insert default SLA rules
INSERT INTO sla_rules (priority, target_hours, escalation_hours, auto_assign, notify_on_overdue) VALUES
('critical', 1, 2, true, true),
('high', 4, 8, true, true),
('medium', 8, 16, true, true),
('low', 24, 48, true, true);