# Contributing

Thanks for your interest in improving the Kiro Telegram Bot!

## Development setup

```bash
git clone https://github.com/artickc/kiro-telegram-bot.git
cd kiro-telegram-bot
npm install
cp .env.example .env   # add your TELEGRAM_BOT_TOKEN and ALLOWED_USERS
npm run dev            # auto-reload on changes
```

No build step is required — the project runs TypeScript directly via `tsx`.

## Before opening a pull request

- `npm run typecheck` must pass with no errors.
- Keep files focused and under ~500 lines; prefer small modules.
- Match the existing style (ESM imports with `.js` specifiers, named exports).
- Don't introduce new dependencies without a good reason.
- Never commit `.env`, tokens, logs, or generated launcher files.

## Project layout

See the "Project layout" section in the [README](./README.md). In short:

- `src/acp` — Agent Client Protocol client and transport
- `src/sessions` — session discovery, history, live tail
- `src/render` — Markdown → Telegram MarkdownV2, diffs, tool formatting
- `src/bot` — grammY bot, handlers, per-chat runtime
- `src/service` — cross-platform daemon install (Windows/Linux/macOS)

## Reporting bugs

Open an issue using the bug template. Include your OS, Node version, Kiro CLI
version (`kiro-cli --version`), and relevant log lines from
`logs/kiro-telegram-bot.log` (redact any secrets).

## Code of Conduct

By participating you agree to abide by the [Code of Conduct](./CODE_OF_CONDUCT.md).
