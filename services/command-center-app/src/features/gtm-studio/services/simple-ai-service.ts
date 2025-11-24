import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY || '',
  dangerouslyAllowBrowser: true, // Since we're in the browser
})

export async function generateSubtasksWithAI(
  taskTitle: string,
  taskContext: any
): Promise<string[]> {
  try {
    const prompt = `You are a strategic planner for a TikTok go-to-market campaign. 
    
Task: "${taskTitle}"
Owner: ${taskContext.ownerContext.role} (${taskContext.task.owner})
Phase: ${taskContext.phaseContext.name}
Due: ${taskContext.task.dueDate}

Create 3-5 CONCISE, actionable subtasks for this task.

Return ONLY a JSON array of strings, like: ["Subtask 1", "Subtask 2", "Subtask 3"]
No other text or formatting.`

    const message = await anthropic.messages.create({
      model: 'claude-opus-4-20250514', // Latest Claude Opus 4 model
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    })

    // Extract the response
    const response =
      message.content[0].type === 'text' ? message.content[0].text : ''

    // Try to parse as JSON
    try {
      const parsed = JSON.parse(response)
      if (Array.isArray(parsed)) {
        return parsed.filter((item) => typeof item === 'string')
      }
    } catch (e) {
      // If not valid JSON, try to extract array from the text
      const match = response.match(/\[[\s\S]*\]/)
      if (match) {
        try {
          const parsed = JSON.parse(match[0])
          if (Array.isArray(parsed)) {
            return parsed.filter((item) => typeof item === 'string')
          }
        } catch (e2) {
          console.error('Failed to parse array from response')
        }
      }
    }

    // Fallback: split by newlines and clean up
    return response
      .split('\n')
      .filter((line) => line.trim())
      .filter((line) => !line.includes('[') && !line.includes(']'))
      .map((line) =>
        line
          .replace(/^[-*•]\s*/, '')
          .replace(/^"\s*|\s*"$/g, '')
          .trim()
      )
      .filter((line) => line.length > 0)
      .slice(0, 5)
  } catch (error) {
    console.error('Failed to generate subtasks with AI:', error)

    // Return sensible defaults based on task type
    const keywords = taskTitle.toLowerCase()

    if (keywords.includes('define') || keywords.includes('metrics')) {
      return [
        'Identify key performance indicators aligned with campaign goals',
        'Set specific targets and benchmarks for each metric',
        'Create tracking dashboard and reporting structure',
      ]
    }

    if (keywords.includes('create') || keywords.includes('build')) {
      return [
        'Design initial concept and requirements',
        'Build the core functionality',
        'Test and refine the implementation',
      ]
    }

    // Generic fallback
    return [
      `Research best practices for ${taskTitle}`,
      `Create initial draft/prototype`,
      `Review and iterate based on feedback`,
    ]
  }
}
