<p align="center">
  <img src="./assets/logo.png" alt="Tuteliq" width="200" />
</p>

<h1 align="center">Tuteliq MCP Server</h1>

<p align="center">
  <strong>MCP server for Tuteliq - AI-powered child safety tools for Claude</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@tuteliq/mcp"><img src="https://img.shields.io/npm/v/@tuteliq/mcp.svg" alt="npm version"></a>
  <a href="https://github.com/Tuteliq/mcp/blob/main/LICENSE"><img src="https://img.shields.io/github/license/Tuteliq/mcp.svg" alt="license"></a>
</p>

<p align="center">
  <a href="https://api.tuteliq.ai/docs">API Docs</a> •
  <a href="https://tuteliq.app">Dashboard</a> •
  <a href="https://discord.gg/7kbTeRYRXD">Discord</a>
</p>

---

## What is this?

Tuteliq MCP Server brings AI-powered child safety tools directly into Claude, Cursor, and other MCP-compatible AI assistants. Ask Claude to check messages for bullying, detect grooming patterns, or generate safety action plans.

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
    "tuteliq": {
      "command": "npx",
      "args": ["-y", "@tuteliq/mcp"],
      "env": {
        "TUTELIQ_API_KEY": "your-api-key"
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
    "tuteliq": {
      "command": "npx",
      "args": ["-y", "@tuteliq/mcp"],
      "env": {
        "TUTELIQ_API_KEY": "your-api-key"
      }
    }
  }
}
```

### Global Install

```bash
npm install -g @tuteliq/mcp
```

Then run:
```bash
TUTELIQ_API_KEY=your-api-key tuteliq-mcp
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

1. Go to [tuteliq.app](https://tuteliq.app)
2. Create an account
3. Generate an API key
4. Add it to your MCP config

---

## Requirements

- Node.js 18+
- Tuteliq API key

---

## Best Practices

### Message Batching

The **bullying** and **unsafe content** tools analyze a single `text` field per request. If you're analyzing a conversation, concatenate a **sliding window of recent messages** into one string rather than sending each message individually. Single words or short fragments lack context for accurate detection and can be exploited to bypass safety filters.

The **grooming** tool already accepts a `messages[]` array and analyzes the full conversation in context.

### PII Redaction

Enable `PII_REDACTION_ENABLED=true` on your Tuteliq API to automatically strip emails, phone numbers, URLs, social handles, IPs, and other PII from detection summaries and webhook payloads. The original text is still analyzed in full — only stored outputs are scrubbed.

---

## Support

- **API Docs**: [api.tuteliq.ai/docs](https://api.tuteliq.ai/docs)
- **Discord**: [discord.gg/7kbTeRYRXD](https://discord.gg/7kbTeRYRXD)
- **Email**: support@tuteliq.ai

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

## The Mission: Why This Matters

Before you decide to contribute or sponsor, read these numbers. They are not projections. They are not estimates from a pitch deck. They are verified statistics from the University of Edinburgh, UNICEF, NCMEC, and Interpol.

- **302 million** children are victims of online sexual exploitation and abuse every year. That is **10 children every second**. *(Childlight / University of Edinburgh, 2024)*
- **1 in 8** children globally have been victims of non-consensual sexual imagery in the past year. *(Childlight, 2024)*
- **370 million** girls and women alive today experienced rape or sexual assault in childhood. An estimated **240–310 million** boys and men experienced the same. *(UNICEF, 2024)*
- **29.2 million** incidents of suspected child sexual exploitation were reported to NCMEC's CyberTipline in 2024 alone — containing **62.9 million files** (images, videos). *(NCMEC, 2025)*
- **546,000** reports of online enticement (adults grooming children) in 2024 — a **192% increase** from the year before. *(NCMEC, 2025)*
- **1,325% increase** in AI-generated child sexual abuse material reports between 2023 and 2024. The technology that should protect children is being weaponized against them. *(NCMEC, 2025)*
- **100 sextortion reports per day** to NCMEC. Since 2021, at least **36 teenage boys** have taken their own lives because they were victimized by sextortion. *(NCMEC, 2025)*
- **84%** of reports resolve outside the United States. This is not an American problem. This is a **global emergency**. *(NCMEC, 2025)*

End-to-end encryption is making platforms blind. In 2024, platforms reported **7 million fewer incidents** than the year before — not because abuse stopped, but because they can no longer see it. The tools that catch known images are failing. The systems that rely on human moderators are overwhelmed. The technology to detect behavior — grooming patterns, escalation, manipulation — in real-time text conversations **exists right now**. It is running at [api.tuteliq.ai](https://api.tuteliq.ai).

The question is not whether this technology is possible. The question is whether we build the company to put it everywhere it needs to be.

**Every second we wait, another child is harmed.**

We have the technology. We need the support.

If this mission matters to you, consider [sponsoring our open-source work](https://github.com/sponsors/Tuteliq) so we can keep building the tools that protect children — and keep them free and accessible for everyone.

---

<p align="center">
  <sub>Built with care for child safety by the <a href="https://tuteliq.ai">Tuteliq</a> team</sub>
</p>
