import { AgentConsole } from './components/agent-console'

export default function ClaudeAgentsPage() {
  return (
    <div className='container mx-auto py-6'>
      <h1 className='mb-6 text-3xl font-bold'>Claude Agents</h1>
      <AgentConsole />
    </div>
  )
}
