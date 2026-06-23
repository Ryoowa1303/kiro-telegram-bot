# Kiro Telegram Bot 🤖

> **Control [Kiro CLI](https://kiro.dev/cli/) from Telegram.** Your AI coding
> assistant in your pocket — switch projects, resume and attach to live coding
> sessions, stream answers with diffs, queue follow-ups, and run it 24/7 as a
> background service on Windows, Linux, and macOS.

![Node](https://img.shields.io/badge/node-%3E%3D20-339933?logo=node.js&logoColor=white)
![Platforms](https://img.shields.io/badge/platforms-Windows%20%7C%20Linux%20%7C%20macOS-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Protocol](https://img.shields.io/badge/protocol-ACP-orange)

A professional Telegram bridge for the **Agent Client Protocol (ACP)** that
turns Kiro CLI into a mobile, always-on AI pair programmer. Send a message from
anywhere and watch Kiro read files, run commands, and edit code on your machine
— with live typing indicators, clean Telegram markdown, and unified edit diffs.

Inspired by [`ajitnk-lab/kiro-acp-telegram-bot`](https://github.com/ajitnk-lab/kiro-acp-telegram-bot)
and extended into a full multi-session client.

---

## ✨ Features

| Capability | What it does |
|---|---|
| 🗂 **Projects** | `/projects` browses your folders and runs Kiro in the one you pick. |
| ♻️ **Resume sessions** | `/sessions` lists recent Kiro sessions; tap to resume via ACP `session/load`. |
| 🟢 **Connect to live sessions** | `/active` shows sessions running **right now** on your PC. Watch them live, or continue them — see below. |
| 📡 **Live watch** | Follow a running session read-only in real time (tails its event log). |
| 🧭 **Always-visible menu** | A persistent keyboard plus a pinned status panel that always shows your current **project, agent, reasoning effort, model, session and queue**. |
| ⏰ **Scheduled tasks** | Create prompts that run on a schedule (once / daily / weekly / monthly / every-N-minutes) in a chosen project, delivered back to your chat. |
| 🖼 **Multi-image prompts** | Send one or many photos (albums included) with a caption — all attached to the prompt for the agent to analyze. |
| 📜 **History** | `/history` shows the latest messages of any session. |
| 🧩 **MCP control** | `/mcp` lists MCP servers, **health-checks** them (which connected / failed and why), and **enables/disables** them — then restarts the agent to apply. |
| 👥 **Subagent visibility** | When Kiro delegates to subagents and waits on them, you see each one **start / work / finish** plus a live `🤖 N running` summary — and subagent permission prompts route to your chat. |
| ⌨️ **Typing indicator** | Stays on for the whole turn, even through long tool chains. |
| 📥 **Queued follow-ups** | Message while Kiro is busy — it's queued and runs next. `/btw` runs it ASAP (now if idle, else right after the current task); `/flush` runs the queue now. |
| ✏️ **Edit diffs** | File edits show as unified `diff` blocks with `+N -M` stats. |
| 💬 **Quality markdown** | Converts agent markdown to Telegram **MarkdownV2** with safe escaping and code-fence-aware splitting. |
| 🔁 **Self-healing** | Auto-restarts the Kiro agent with backoff and re-binds your session. |
| 🖥 **Runs 24/7** | 1-click install as a background service that starts on boot — Windows, Linux, macOS, auto-detected. |
| 🔒 **Access control** | Restrict to specific Telegram user IDs. |

---

## 📊 How it compares

| Capability | **This bot** | Other Kiro Telegram bots |
|---|:---:|:---:|
| Connect Kiro CLI to Telegram (ACP) | ✅ | ✅ |
| Switch between projects | ✅ | ❌ |
| Resume saved sessions | ✅ | ❌ |
| Attach to **live** PC sessions (watch / fork) | ✅ | ❌ |
| Multiple isolated sessions | ✅ | ❌ (single shared) |
| Queued follow-ups while busy | ✅ | ❌ |
| **Scheduled tasks** (cron-like) | ✅ | ❌ |
| **Multi-image** prompts (albums) | ✅ | ❌ |
| Unified **edit diffs** | ✅ | ❌ |
| Persistent menu + live status panel | ✅ | ❌ |
| Agent / reasoning / model menus | ✅ | ❌ |
| Combined, throttled output (no spam) | ✅ | ❌ |
| Auto-restart + session re-bind | ✅ | ❌ |
| 24/7 cross-platform service | ✅ | ❌ |
| 1-click install | ✅ | ❌ |

---

## ⚡ Install from npm

The fastest way — one command installs the global **`kiro-tg`** CLI (ships with
the `tsx` runtime, no build step):

```bash
npm install -g kiro-telegram-bot
```

Everything operates on the **current folder** (its `.env`, `logs/`, `data/`), so
keep one folder per bot:

```bash
mkdir my-bot && cd my-bot
kiro-tg setup            # auto-detects kiro-cli, writes ./.env
# edit .env: set TELEGRAM_BOT_TOKEN and ALLOWED_USERS
kiro-tg run              # foreground …
kiro-tg install          # … or install as a 24/7 background service
```

Startup options: `kiro-tg setup | run | install | status | logs [n] | stop |
restart | uninstall`. Or try it without installing: `npx kiro-telegram-bot
setup`. See **[docs/INSTALL.md](./docs/INSTALL.md)** for the full guide.

---

## 🚀 1-click install

Clone or download, then run the installer for your OS. It installs
dependencies, auto-detects `kiro-cli`, writes `.env`, asks for your bot token,
and optionally sets up the background service.

**Windows** — double-click `install.cmd` (or in a terminal):

```powershell
.\install.cmd
```

**Linux / macOS**:

```bash
chmod +x install.sh && ./install.sh
```

### Prerequisites

- **Kiro CLI** installed and authenticated — run `kiro-cli chat` once to confirm.
- **Node.js 20+**.
- A **bot token** from [@BotFather](https://t.me/BotFather).
- Your **Telegram user ID** from [@userinfobot](https://t.me/userinfobot).

---

## 🧑‍💻 Manual setup

```bash
npm install
npm run setup            # auto-detects kiro-cli + project roots, writes .env
# edit .env: set TELEGRAM_BOT_TOKEN and ALLOWED_USERS
npm start
```

No build step — TypeScript runs directly via `tsx`.

---

## 🛠 Run as a background service (daemon)

The bot installs as a **user-level** service that starts automatically on boot.
The platform is auto-detected:

| OS | Mechanism | Starts on |
|---|---|---|
| Windows | Hidden Scheduled Task | logon |
| Linux | systemd **user** service (+ linger) | boot |
| macOS | launchd LaunchAgent | login |

```bash
npm run install:service     # install + start, enable autostart
npm run service -- status   # show install + running state
npm run service -- stop
npm run service -- restart
npm run service -- logs 200 # tail the log file
npm run uninstall:service   # stop + remove
```

Or use the `kiro-tg` command (if linked): `kiro-tg install | status | logs`.

Logs are written to `logs/kiro-telegram-bot.log` (rotated at 5 MB).

---

## 💬 Commands

```
/menu         Show the persistent menu keyboard
/projects     List · /projects <q> search · /projects <path> open any folder · /projects new <name>
/sessions     List & resume sessions (active first) · /sessions <q> to filter
/active       Sessions running now on the PC
/running      Sessions this chat controls — switch between them
/killall      Kill all active sessions on the PC (with confirm)
/mcp          Inspect MCP servers · health-check · enable/disable
/tasks        Manage scheduled tasks
/newtask      Create a scheduled task (wizard)
/history      Show recent conversation history
/new          Start a fresh session here
/status       Current session, project & queue
/usage        Account info & current context usage
/btw <text>   Run it now if idle, else queue to run right after the current task
/flush        Send queued follow-ups now
/queue        Show queued follow-ups
/clearqueue   Clear the queue
/cancel       Stop the current turn
/unwatch      Stop following a live session
/model <id>   Switch the model for this session
/restart      Restart the Kiro agent
/help         Show help
```

Anything that isn't a command is sent to Kiro as a prompt. While a turn is
running, your messages are queued and sent automatically when it finishes.

---

## 🧭 The menu & status panel

A tiny **persistent bar** sits under the message box — **☰ Menu · 🧭 Running ·
⏹ Stop** — so common actions are one tap away without clutter. Tap **☰ Menu**
(or `/menu`) to open a clean, grouped **inline menu**: Project · New · Running ·
Sessions · Agent · Model · Reasoning · Tasks · Status · Usage · Stop · Kill all.
The bar can be hidden (🙈) and restored (⌨️ Show bar or `/menu`).

A **pinned status panel** at the top of the chat always shows your current
**project, agent, reasoning effort, model, session id, context %, activity and
queue** (and how many sessions the chat controls), updating live. Pick **Agent**,
**Reasoning** or **Model** from the inline menu (reasoning steers how thoroughly
the agent works: Minimal → Max).

## ⏰ Scheduled tasks

A task is a **prompt + a project + a schedule**. When it fires, the bot opens a
session in that project, runs the prompt, and delivers the result to your chat.

- **/newtask** (or the ➕ button) launches a guided wizard: name → prompt →
  project → schedule → confirm.
- **Schedules**: `once` at a date/time, `daily` at HH:MM, `weekly` (e.g. `Mon 09:00`),
  `monthly` (e.g. `15 09:00`), or `interval` (every N minutes).
- **/tasks** lists everything with buttons to **run now, enable/disable, edit**
  (rename, prompt, project, reschedule) and **delete**.

Tasks are stored in `data/tasks.json` and survive restarts; the scheduler runs
them whether you're online or not (great with the 24/7 service).

## 🖼 Sending images

Send one or several photos — including a Telegram **album** — with an optional
caption. The bot downloads them and attaches them all to the prompt as image
content blocks, so the agent can analyze them together. Images sent while Kiro
is busy are queued with your next turn.

**Images come back too:** when the agent produces images during a turn (e.g.
takes screenshots while testing an app), the bot detects the freshly-written
files and sends them back to Telegram automatically (`SEND_AGENT_IMAGES`).

## 🎙 Sending voice

Send a voice note (or audio file) and the bot transcribes it and runs it as a
prompt. Configure any OpenAI/Whisper-compatible endpoint via `STT_API_URL` in
`.env`; leave `STT_LANGUAGE` blank for automatic detection (English, Russian,
Romanian/Moldovan, and ~100 more).

---

## 🧭 Working on several sessions at once

One chat can drive **multiple Kiro sessions** and switch between them. Start a
session (📁 Project / 🆕 New), and each becomes a "controlled" session. Tap
**🧭 Running** (or `/running`) to switch: the foreground session streams live
while the others keep working quietly. When you switch to a session you see its
recent context and **every message that arrived while you were away** (its
unread, recovered from the session log). Leave a task running in A, hop to B,
reply, and come back to A to read what it did. Close a session with ✖ (it isn't
killed — see `/killall` for that).

## 🔗 Connecting to live sessions

Kiro keeps an **exclusive lock** on a session while it's running, so a second
client cannot hijack a session that's open in another window. This bot handles
that honestly:

- **📡 Watch** — follow the running session's output live (read-only) by tailing
  its event log. Stop with `/unwatch`.
- **Continue (fork)** — tapping a live session opens a **linked continuation** in
  the same project, primed with the recent transcript, so you can keep
  interacting from Telegram without disturbing the original.

Resuming an **idle** session loads it directly so you continue the exact thread.

---

## ⚙️ Configuration (`.env`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `TELEGRAM_BOT_TOKEN` | **yes** | — | Bot token from @BotFather. |
| `ALLOWED_USERS` | recommended | *(all)* | Comma-separated Telegram user IDs. Empty = anyone (unsafe). |
| `KIRO_CLI_PATH` | no | auto / `kiro-cli` | Path to the `kiro-cli` binary. |
| `KIRO_WORKSPACE` | no | cwd | Default working directory. |
| `KIRO_AGENT` | no | — | Custom agent from `.kiro/agents/`. |
| `KIRO_TRUST_ALL_TOOLS` | no | `true` | Run tools without prompts. |
| `PROJECT_ROOTS` | no | workspace parent + home | Roots for `/projects`. |
| `STREAM_THROTTLE_MS` | no | `1200` | Live-edit interval while streaming. |
| `MESSAGE_BATCH_MS` | no | `800` | Window to coalesce rapid text messages (e.g. a long message Telegram split at 4096 chars) into one prompt. `0` disables. |
| `SHOW_TOOL_CALLS` | no | `true` | Show tool-call status messages. |
| `SHOW_EDIT_DIFFS` | no | `true` | Show unified diffs for edits. |
| `DIFF_MAX_LINES` | no | `120` | Max diff lines shown inline. |
| `SHOW_SUBAGENTS` | no | `true` | Stream subagent (crew) start/work/finish while the main agent waits. |
| `NOTIFY_OTHER_SESSIONS` | no | `true` | Deliver a session's "Done" summary (with a short created/edited/deleted count) even when it's a background session, marked "From other session". `false` keeps background sessions silent. |
| `MCP_PROBE_TIMEOUT_MS` | no | `8000` | Per-server timeout for the `/mcp` live health-check. |
| `MCP_PROBE_CONCURRENCY` | no | `6` | How many MCP health probes run at once. |
| `ACP_AUTO_RESTART` | no | `true` | Auto-restart the agent if it exits. |
| `AUTO_UPDATE` | no | `true` | Hourly check npm and, when a newer version exists **and the bot is idle** (no turn/task running, no other active Kiro session), auto-update + restart + post the release notes (tagged `#update`). Global npm installs only. |
| `UPDATE_CHECK_MS` | no | `3600000` | How often to check npm for updates (ms). |
| `PROMPT_RETRY_ATTEMPTS` | no | `5` | Max retries for a transient agent error (e.g. high-traffic / `Internal error`) before any output streamed, with `6s → 12s → 24s → 48s → 60s` backoff. The real error shows each attempt; a summary after the last. `0` disables. |
| `AUTO_FORK_ON_ERROR` | no | `true` | When the retries above are exhausted on a transient error (throttle / `Internal error` / exhausted context) and nothing streamed, **logically fork** the session — open a fresh continuation primed with the recent transcript, drop the stuck session, and retry the message once. |
| `AUTO_FORK_CONTEXT_PCT` | no | `85` | When a prompt fails transiently **and** the session's last-known context usage is at/above this %, **skip the retry backoff and fork immediately** — a context-exhausted session won't recover by retrying the same oversized prompt (throttling on a near-full session shows up as `-32603 … throttled`). Forking compacts it into a fresh continuation primed with the recent transcript. Requires `AUTO_FORK_ON_ERROR`; `0` disables this trigger. |
| `LOG_LEVEL` | no | `info` | `debug` \| `info` \| `warn` \| `error`. |
| `LOG_DIR` / `LOG_FILE` | no | `<project>/logs/…` | Log location. |

---

## 🧩 How it works

```
Telegram  ──HTTPS──▶  Bot (grammY)
                         │  spawns once
                         ▼
                 kiro-cli acp  ◀── JSON-RPC 2.0 over stdio ──▶  Bot
                         │
                         ├─ session/new / session/load   (projects, resume)
                         ├─ session/prompt               (your messages)
                         └─ session/update notifications (streamed text, tools)
```

One `kiro-cli acp` process multiplexes many sessions (one per chat/project).
Streamed `agent_message_chunk` updates are assembled into a live, throttled
message; `tool_call` updates render as professional status lines with diffs.

Kiro persists sessions to `~/.kiro/sessions/cli/`:
`<id>.json` (metadata), `<id>.jsonl` (history, used by `/history` and live
watch), and `<id>.lock` (`{ pid }`, used to detect active sessions).

---

## 📁 Project layout

```
src/
├── index.ts              Entry point, daemon-friendly logging, shutdown
├── cli.ts                CLI: run / install / start / stop / status / logs
├── config.ts             .env loading, paths, daemon options
├── logger.ts             Leveled logger with file output
├── acp/                  ACP client, transport, server-side handlers, types
├── sessions/             Session discovery, history parser, live tail watcher
├── projects/             Project directory discovery
├── mcp/                  MCP config (list/toggle) + live health probe
├── render/               Markdown→MarkdownV2, diffs, tool formatting, chunking
├── stream/               Incremental edit-streaming
├── service/              Cross-platform daemon (windows/linux/macos + selector)
└── bot/                  grammY bot, per-chat runtime, handlers
```

---

## ❓ FAQ

**Can I run the Kiro Telegram bot 24/7 on a server?** Yes — `npm run install:service`
installs a user-level service (systemd/launchd/Scheduled Task) that starts on
boot and auto-restarts on crash.

**How do I control Kiro from my phone?** Set up the bot, message it on Telegram,
and pick a project with `/projects`. Every message becomes a Kiro prompt.

**Can multiple people use one bot?** Add their IDs to `ALLOWED_USERS`. Each chat
gets its own session.

**Why can't I take over a session that's already running?** Kiro locks active
sessions exclusively. The bot lets you **watch** it live or **fork** a linked
continuation instead. See "Connecting to live sessions".

**Does it support custom agents and MCP servers?** Yes — set `KIRO_AGENT`, and
the bot inherits whatever MCP servers Kiro CLI is configured with.

---

## 🔐 Inline approvals

The bot implements ACP `session/request_permission`: when Kiro asks the client
to approve a risky tool call, it appears in Telegram with **Approve / Approve
always / Deny** buttons and your choice is sent back (unanswered prompts time
out and are denied).

> Note: Kiro CLI 2.8.1 resolves tool permissions internally (via
> `~/.kiro/settings/permissions.yaml` and agent config) and does **not** yet
> delegate them over ACP, so these prompts stay dormant on current Kiro. The
> wiring is forward-compatible and activates automatically when Kiro emits
> permission requests. Today, use the live tool stream + **⏹ Stop** to
> intervene, and `permissions.yaml` to govern what Kiro may do.

## 🔐 Security

This bot lets authorized Telegram users run commands and edit files on the host.
**Always set `ALLOWED_USERS`**, keep `.env` private, and run as a non-privileged
user. See [SECURITY.md](./SECURITY.md) for the full model.

---

## 🗺 Roadmap

- [x] Projects, resume & attach to live sessions
- [x] Queued follow-ups, edit diffs, quality MarkdownV2
- [x] Persistent menu + live status panel (project / agent / reasoning / model)
- [x] Scheduled tasks (once / daily / weekly / monthly / interval)
- [x] Multi-image prompts (albums)
- [x] Combined, throttled output (anti-spam)
- [x] 24/7 cross-platform background service
- [x] Voice messages → speech-to-text → prompt (multi-language)
- [x] Context-usage % in the status panel
- [x] Inline approvals — approve/deny risky tools from buttons (non trust-all mode)
- [x] Account & context usage (`/usage`)
- [x] Release automation — downloadable zip + CHANGELOG-driven notes on tag push
- [x] README community sections — Contributors, Top Contributors, Stars, StarMapper
- [ ] **Token & cost meter** — per-session token counts and an estimated spend tally
- [ ] **Text-to-speech replies** — optionally speak answers back as voice notes
- [ ] **Scheduled-task chaining & conditions** — run task B after A, or only if a command/file check passes
- [ ] **Team mode** — multiple authorized users with per-user sessions, roles, and an audit log
- [ ] Localized bot UI (i18n)
- [ ] Docker image with `kiro-cli` preinstalled
- [ ] Webhook mode for serverless deployment

Have an idea? Open a [feature request](../../issues/new/choose).

## 🤝 Contributing

Contributions are very welcome! See **[CONTRIBUTING.md](./CONTRIBUTING.md)** to get
started — no build step is required (`npm run dev`), and `npm run typecheck` must
pass.

New here? Look for issues labeled
[**good first issue**](../../issues?q=is%3Aopen+label%3A%22good+first+issue%22)
and [**help wanted**](../../issues?q=is%3Aopen+label%3A%22help+wanted%22).

By participating you agree to the [Code of Conduct](./CODE_OF_CONDUCT.md).

---

## 👥 Contributors

[![Contributors](https://contrib.rocks/image?repo=artickc/kiro-telegram-bot&max=100&columns=20&anon=1)](https://github.com/artickc/kiro-telegram-bot/graphs/contributors)

### How to Contribute

1. Fork the repository
2. Create your feature branch (`git checkout -b feat/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feat/amazing-feature`)
5. Open a Pull Request

See [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed guidelines.

### Releasing a New Version

```bash
# Bump the version, update CHANGELOG.md, then push a tag.
# The release workflow builds a downloadable zip and publishes notes automatically.
npm version minor              # or: patch / major — updates package.json + commits
git push --follow-tags         # pushing the v* tag triggers .github/workflows/release.yml
```

---

## ⭐ Top Contributors

> This project is built and maintained in the open. These people have made the
> contributions that shape its quality, stability, and reach. **Thank you.**

<table>
  <tr>
    <td align="center" width="180">
      <a href="https://github.com/artickc">
        <img src="https://github.com/artickc.png?size=100" width="80" height="80" style="border-radius:50%" alt="artickc"/><br/>
        <sub><b>artickc</b></sub>
      </a><br/>
      🥇 Maintainer<br/>
      <sub>Created the bot: ACP client, multi-session<br/>runtime, scheduler, daemon &amp; renderer</sub>
    </td>
  </tr>
</table>

> 🙏 Every pull request, bug report, and idea matters. Open source is built by
> people like them — see the full list under [Contributors](#-contributors).

---

## 📊 Stars

<a href="https://www.star-history.com/?repos=artickc%2Fkiro-telegram-bot&type=date&legend=top-left">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=artickc/kiro-telegram-bot&type=Date&theme=dark&legend=top-left" />
    <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=artickc/kiro-telegram-bot&type=Date&legend=top-left" />
    <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=artickc/kiro-telegram-bot&type=Date&legend=top-left" />
  </picture>
</a>

If this project helps you, please consider giving it a ⭐ — it really helps!

---

## 🌍 StarMapper

> See where in the world this project's stargazers live — an interactive map of
> the community.

<a href="https://starmapper.bruniaux.com/artickc/kiro-telegram-bot">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://starmapper.bruniaux.com/api/map-image/artickc/kiro-telegram-bot?theme=dark" />
    <source media="(prefers-color-scheme: light)" srcset="https://starmapper.bruniaux.com/api/map-image/artickc/kiro-telegram-bot?theme=light" />
    <img alt="StarMapper — where this project's stargazers live" src="https://starmapper.bruniaux.com/api/map-image/artickc/kiro-telegram-bot" />
  </picture>
</a>

---

## 📦 Download & Releases

Grab the latest packaged build from the
[**Releases**](https://github.com/artickc/kiro-telegram-bot/releases) page — each
release ships a clean `kiro-telegram-bot-<version>.zip` (no `node_modules` or
secrets) plus GitHub's source archives. See [CHANGELOG.md](./CHANGELOG.md) for
what changed in each version, and **[docs/INSTALL.md](./docs/INSTALL.md)** for the
full 1-click install guide.

---

## 📄 License

[MIT](./LICENSE) — see also [CONTRIBUTING](./CONTRIBUTING.md) and
[Code of Conduct](./CODE_OF_CONDUCT.md).

---

<sub>Keywords: Kiro CLI Telegram bot, ACP Agent Client Protocol, AI coding
assistant on Telegram, mobile AI pair programming, remote coding agent, run AI
agent as a service, Windows/Linux/macOS daemon, ChatOps for developers.</sub>
