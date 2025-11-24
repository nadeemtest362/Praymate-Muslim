# Command Center API

NestJS backend service for managing Claude agent sessions.

## Installation

```bash
npm install
```

## Running the app

```bash
# development
npm run start

# watch mode
npm run start:dev

# production mode
npm run start:prod
```

## API Endpoints

### REST API

- `POST /claude-agents/missions` - Start a new agent mission
- `POST /claude-agents/decisions` - Respond to a decision point
- `GET /claude-agents/sessions/:sessionId` - Get session details
- `GET /claude-agents/sessions` - List all sessions
- `DELETE /claude-agents/sessions/:sessionId` - Stop a session
- `GET /claude-agents/health` - Health check

### WebSocket Events

**Client -> Server:**
- `join-session` - Join a session room
- `leave-session` - Leave a session room

**Server -> Client:**
- `session-started` - Session has started
- `agent-thought` - Agent thought/action/result
- `decision-point` - Decision required from user
- `session-completed` - Session completed
- `session-error` - Session error

## Environment Variables

- `PORT` - Server port (default: 3001)