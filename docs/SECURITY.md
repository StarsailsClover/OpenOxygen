# Security Model

## Architecture

```
User Request
    │
    ▼
[Rate Limiter] → 429 if exceeded
    │
    ▼
[Auth] → 401 if failed (timing-safe comparison)
    │
    ▼
[Prompt Injection Detector] → 400 if high-risk
    │
    ▼
[Permission Check] → 403 if denied
    │
    ▼
[Execution] → Audit logged
    │
    ▼
[Response] → API keys masked
```

## Threat Mitigations

### CVE-2026-25253 — Gateway URL Injection
- Query strings stripped from path routing
- Gateway URL cannot be overridden by external input
- Binding validation rejects `0.0.0.0` and privileged ports

### ClawJacked — WebSocket Hijack
- Origin whitelist (localhost-only by default)
- Rate limiter with auth failure tracking
- Auto-block after 5 consecutive failures
- Timing-safe token comparison

### CVE-2026-24763 — Command Injection
- Shell metacharacter sanitization (`;`, `|`, `` ` ``, `$()`)
- Command blacklist: `powershell`, `cmd`, `certutil`, `bitsadmin`
- Environment variable sanitization (`LD_PRELOAD`, `NODE_OPTIONS` removed)

### CVE-2026-25593 — Prompt Injection
- 3-level detection: high / medium / low
- High-risk patterns blocked at gateway
- Audit event generated for all detections

### Supply Chain
- SHA-256 integrity verification for plugins
- Ed25519 signing and verification
- Dependency audit with CVE pattern matching
- Blocked package list

### Credential Protection
- AES-256-GCM runtime encryption for API keys
- API key masking in logs (`sk-1****cdef`)
- Secure temp files with 0600 permissions
- 3-pass secure deletion

## Privilege Levels

| Level | Allowed Operations |
|-------|-------------------|
| `minimal` | file.read, file.list, clipboard.read, screen.capture |
| `standard` | + file.write, network.request, input.keyboard, input.mouse |
| `elevated` | + file.delete, process.start/kill, registry.read/write |

## Input Security

- HMAC-SHA256 signed input sequences
- Nonce-based anti-replay
- Time-window expiry
- Human-likeness scoring (robot detection)
- Safety guard: max 10 consecutive ops, 100ms interval, 5s auto-release

## Audit Trail

All system operations logged to `audit.jsonl`:
```json
{
  "id": "audit-xxx",
  "timestamp": 1773000000000,
  "operation": "file.write",
  "actor": "agent:default",
  "target": "/path/to/file",
  "severity": "info",
  "rollbackable": true
}
```

Query via API or SQLite:
```sql
SELECT * FROM audit_log WHERE severity = 'critical' ORDER BY timestamp DESC LIMIT 10;
```
