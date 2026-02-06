<p align="center">
  <img src="https://raw.githubusercontent.com/SafeNestSDK/mcp/main/assets/logo.png" alt="SafeNest" width="200" />
</p>

<h1 align="center">SafeNest MCP Server</h1>

<p align="center">
  <strong>MCP server for SafeNest - AI-powered child safety tools for Claude</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@safenest/mcp"><img src="https://img.shields.io/npm/v/@safenest/mcp.svg" alt="npm version"></a>
  <a href="https://github.com/SafeNestSDK/mcp/blob/main/LICENSE"><img src="https://img.shields.io/github/license/SafeNestSDK/mcp.svg" alt="license"></a>
</p>

<p align="center">
  <a href="https://api.safenest.dev/docs">API Docs</a> •
  <a href="https://safenest.app">Dashboard</a> •
  <a href="https://discord.gg/7kbTeRYRXD">Discord</a>
</p>

---

## What is this?

SafeNest MCP Server brings AI-powered child safety tools directly into Claude, Cursor, and other MCP-compatible AI assistants. Ask Claude to check messages for bullying, detect grooming patterns, or generate safety action plans.

## Available Tools

| Tool | Description |
|------|-------------|
| `detect_bullying` | Analyze text for bullying, harassment, or harmful language |
| `detect_grooming` | Detect grooming patterns and predatory behavior in conversations |
| `detect_unsafe` | Identify unsafe content (self-harm, violence, explicit material) |
| `analyze` | Quick comprehensive safety check (bullying + unsafe) |
| `analyze_emotions` | Analyze emotional content and mental state indicators |
| `get_action_plan` | Generate age-appropriate guidance for safety situations |
| `generate_report` | Create incident reports from conversations |

---

## Installation

### Claude Desktop

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json` on Mac):

```json
{
  "mcpServers": {
    "safenest": {
      "command": "npx",
      "args": ["-y", "@safenest/mcp"],
      "env": {
        "SAFENEST_API_KEY": "your-api-key"
      }
    }
  }
}
```

### Cursor

Add to your Cursor MCP settings:

```json
{
  "mcpServers": {
    "safenest": {
      "command": "npx",
      "args": ["-y", "@safenest/mcp"],
      "env": {
        "SAFENEST_API_KEY": "your-api-key"
      }
    }
  }
}
```

### Global Install

```bash
npm install -g @safenest/mcp
```

Then run:
```bash
SAFENEST_API_KEY=your-api-key safenest-mcp
```

---

## Usage Examples

Once configured, you can ask Claude:

### Bullying Detection
> "Check if this message is bullying: 'Nobody likes you, just go away'"

**Response:**
```
## ⚠️ Bullying Detected

**Severity:** 🟠 Medium
**Confidence:** 92%
**Risk Score:** 75%

**Types:** exclusion, verbal_abuse

### Rationale
The message contains direct exclusionary language...

### Recommended Action
`flag_for_moderator`
```

### Grooming Detection
> "Analyze this conversation for grooming patterns..."

### Quick Safety Check
> "Is this message safe? 'I don't want to be here anymore'"

### Emotion Analysis
> "Analyze the emotions in: 'I'm so stressed about school and nobody understands'"

### Action Plan
> "Give me an action plan for a 12-year-old being cyberbullied"

### Incident Report
> "Generate an incident report from these messages..."

---

## Get an API Key

1. Go to [safenest.app](https://safenest.app)
2. Create an account
3. Generate an API key
4. Add it to your MCP config

---

## Requirements

- Node.js 18+
- SafeNest API key

---

## Support

- **API Docs**: [api.safenest.dev/docs](https://api.safenest.dev/docs)
- **Discord**: [discord.gg/7kbTeRYRXD](https://discord.gg/7kbTeRYRXD)
- **Email**: support@safenest.dev

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

<p align="center">
  <sub>Built with care for child safety by the <a href="https://safenest.dev">SafeNest</a> team</sub>
</p>
