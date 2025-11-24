import { createOpenAI } from '@ai-sdk/openai'
import { generateText } from 'ai'
import * as dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config({ path: resolve(__dirname, '.env') })

const openai = createOpenAI({
  apiKey: process.env.VITE_OPENAI_API_KEY!,
})

async function testJesusFormat() {
  const prompt = `Create compelling content about Jesus Christ. Focus on lesser-known stories, surprising teachings, or powerful moments from the Gospels. Make it relevant to modern struggles.

Format exactly like this:
HOOK: [Opening line that grabs attention]
TEXT 1: [Build the story/context]
TEXT 2: [Add surprising element]
TEXT 3: [Deeper meaning]
REVEAL: [Powerful conclusion]`

  console.log('Testing Jesus format generation...\n')
  
  const { text } = await generateText({
    model: openai('gpt-4o'),
    prompt,
    temperature: 0.8,
    maxTokens: 500,
  })
  
  console.log('Generated content:')
  console.log('---')
  console.log(text)
  console.log('---')
  
  // Test parsing
  const lines = text.split('\n').filter(l => l.trim())
  const overlays: any[] = []
  
  lines.forEach(line => {
    const match = line.match(/^(HOOK|TEXT \d|REVEAL):\s*(.+)$/i)
    if (match) {
      overlays.push({ label: match[1], text: match[2].trim() })
    }
  })
  
  console.log('\nParsed overlays:')
  console.log(JSON.stringify(overlays, null, 2))
}

testJesusFormat().catch(console.error)