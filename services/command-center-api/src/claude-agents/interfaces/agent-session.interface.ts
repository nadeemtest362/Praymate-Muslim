export interface AgentSession {
  id: string;
  mission: string;
  status: 'idle' | 'running' | 'completed' | 'error';
  startedAt: Date;
  completedAt?: Date;
  error?: string;
  process?: any;
  result?: string;
}

export interface AgentThought {
  sessionId: string;
  timestamp: Date;
  type: 'thought' | 'action' | 'result' | 'error' | 'decision_point';
  content: string;
  metadata?: any;
}

export interface DecisionPoint {
  sessionId: string;
  id: string;
  question: string;
  options: string[];
  timestamp: Date;
}