import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function checkClaudeCLI(): Promise<{
  installed: boolean
  version?: string
  error?: string
}> {
  try {
    const { stdout } = await execAsync('claude --version')
    const version = stdout.trim()
    return {
      installed: true,
      version,
    }
  } catch (error) {
    return {
      installed: false,
      error:
        'Claude CLI not found. Please install it with: npm install -g @anthropic-ai/claude-cli',
    }
  }
}

export async function checkAPIKey(): Promise<{
  configured: boolean
  error?: string
}> {
  const apiKey =
    process.env.ANTHROPIC_API_KEY || import.meta.env.VITE_ANTHROPIC_API_KEY

  if (!apiKey) {
    return {
      configured: false,
      error: 'ANTHROPIC_API_KEY not found in environment variables',
    }
  }

  return {
    configured: true,
  }
}
