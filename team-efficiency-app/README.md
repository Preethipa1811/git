# Team Efficiency App

A web application designed to eliminate code review bottlenecks for development teams. The app provides real-time visibility into approval queues, automated reviewer assignment, SLA tracking, and escalation workflows to keep code moving smoothly.

## Features

### 🎯 Core Functionality
- **Real-time Approval Queue**: View all pending code reviews with SLA timers and urgency indicators
- **Smart Assignment Algorithm**: Automatically distribute reviews based on workload, availability, and expertise
- **SLA Management**: Configurable SLA rules with automatic escalation when deadlines are missed
- **Team Metrics Dashboard**: Analytics on review times, bottlenecks, and team performance

### 🔧 Technical Features
- **GitHub Integration**: Webhook-based integration for automatic PR tracking
- **Real-time Updates**: WebSocket-powered live updates for instant notifications
- **Responsive Design**: Mobile-friendly interface for on-the-go monitoring
- **Configurable Rules**: Customizable SLA policies and team settings

## Architecture

### Backend (Node.js + Express + TypeScript)
- **Database**: PostgreSQL with optimized schema for approval tracking
- **Real-time**: Socket.io for live dashboard updates
- **Integration**: GitHub webhooks for PR lifecycle management
- **Services**: Modular architecture with dedicated services for approvals, notifications, metrics, and escalations

### Frontend (React + TypeScript)
- **UI Framework**: React with TypeScript for type safety
- **State Management**: React hooks for local state, API for server state
- **Styling**: CSS-in-JS with custom design system
- **Charts**: Metrics visualization with Recharts

### Database Schema
- `approvals` - PR requests and status tracking
- `team_members` - Team member profiles and availability
- `assignments` - Review assignment history
- `notifications` - Alert system
- `metrics` - Performance analytics data

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 13+
- GitHub account (for webhook integration)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd team-efficiency-app
   ```

2. **Set up the database**
   ```bash
   createdb team_efficiency
   psql team_efficiency < database/schema.sql
   ```

3. **Install backend dependencies**
   ```bash
   cd backend-api
   npm install
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Install frontend dependencies**
   ```bash
   cd ../frontend-app
   npm install
   cp .env.example .env
   # Edit .env with your configuration
   ```

5. **Start the development servers**
   ```bash
   # Backend (port 3001)
   cd backend-api
   npm run dev

   # Frontend (port 3000)
   cd ../frontend-app
   npm run dev
   ```

### Configuration

#### Backend Environment Variables
```bash
DATABASE_URL=postgresql://username:password@localhost:5432/team_efficiency
GITHUB_TOKEN=your_github_personal_access_token
GITHUB_WEBHOOK_SECRET=your_webhook_secret_here
```

#### Frontend Environment Variables
```bash
VITE_API_URL=http://localhost:3001/api
```

#### GitHub Webhook Setup
1. Go to your GitHub repository Settings → Webhooks
2. Add a new webhook pointing to `https://your-domain.com/api/webhooks/github`
3. Select events: Pull requests, Pushes
4. Use your webhook secret for security

## Usage

### For Team Members
1. **View the Queue**: Navigate to the dashboard to see all pending reviews
2. **Check Assignments**: View your assigned reviews and their SLA status
3. **Complete Reviews**: Mark reviews as approved/rejected with feedback
4. **Escalate When Needed**: Escalate stuck reviews to team leads

### For Team Leads
1. **Monitor Team Health**: Use the metrics dashboard to identify bottlenecks
2. **Configure SLAs**: Set appropriate target times for different priority levels
3. **Manage Team**: Update member availability and expertise areas
4. **Review Escalations**: Handle escalated reviews and adjust processes

### Smart Assignment Algorithm
The system considers:
- **Current Workload**: Distributes reviews to prevent overload (max 3 per reviewer)
- **Availability**: Only assigns to available team members
- **Expertise Matching**: Prioritizes reviewers with relevant domain knowledge
- **Rotation**: Balances assignments across team members over time

## API Endpoints

### Approvals
- `GET /api/approvals/queue` - Get pending approval queue
- `POST /api/approvals/assign` - Auto-assign reviewer
- `POST /api/approvals/escalate/:id` - Escalate approval
- `POST /api/approvals/complete/:id` - Complete review

### Metrics
- `GET /api/metrics/team` - Team performance metrics
- `GET /api/metrics/bottlenecks` - Current bottlenecks
- `GET /api/metrics/trends` - Historical trends

### Webhooks
- `POST /api/webhooks/github/pr-opened` - GitHub PR opened
- `POST /api/webhooks/github/pr-closed` - GitHub PR closed

## Development

### Project Structure
```
team-efficiency-app/
├── backend-api/           # Node.js backend
│   ├── src/
│   │   ├── controllers/   # API route handlers
│   │   ├── services/      # Business logic
│   │   ├── models/        # Database models
│   │   └── types/         # TypeScript types
├── frontend-app/          # React frontend
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── pages/         # Page components
│   │   └── services/      # API integration
└── database/              # Database schema and migrations
```

### Running Tests
```bash
# Backend
cd backend-api
npm test

# Frontend
cd frontend-app
npm test
```

### Building for Production
```bash
# Backend
cd backend-api
npm run build

# Frontend
cd frontend-app
npm run build
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support and questions:
- Create an issue in the GitHub repository
- Contact the development team
- Check the documentation for common troubleshooting steps

---

**Built with ❤️ for development teams that value efficiency and collaboration**