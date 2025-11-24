# Claude Agents Integration Fixed

The issue was that the Claude CLI was prompting for API key confirmation in interactive mode. The solution is to use the Claude Code SDK properly with the `-p` (print/non-interactive) flag and `stream-json` output format.

## What was fixed:

### 1. Updated claude-agents.service.ts to use proper SDK flags:

```typescript
const claudeArgs = [
  '-p',  // Print mode (non-interactive)
  mission,
  '--output-format', 'stream-json',  // Stream JSON for real-time updates
  '--max-turns', '1',
  '--verbose'  // For debugging
];

const claudeProcess = spawn('claude', claudeArgs, {
  env: {
    ...process.env,
    ANTHROPIC_API_KEY: apiKey,
    // Ensure we're in a non-TTY environment
    TERM: 'dumb',
    CI: 'true'
  },
  stdio: ['pipe', 'pipe', 'pipe']
});
```

### 2. Updated message handling for stream-json format:

The Claude Code SDK outputs messages as newline-delimited JSON when using `--output-format stream-json`. Each message follows the schema documented in the SDK docs:

- `system` messages with `subtype: "init"` at the start
- `assistant` messages containing Claude's responses
- `result` messages with cost and duration info at the end

### 3. Key insights from the Claude Code SDK docs:

- The `-p` flag runs Claude in non-interactive mode (no prompts)
- The SDK is designed for programmatic use with proper environment setup
- The `stream-json` format provides real-time updates as Claude processes

## Testing:

The integration should now work properly. Test it by:

1. Ensuring the command-center-api is running with the ANTHROPIC_API_KEY set
2. Using the GTM Studio to request a plan for any task
3. The Strategy Agent should now properly generate subtasks using Claude

The Claude Code SDK is working as intended - no need to switch to a different SDK!