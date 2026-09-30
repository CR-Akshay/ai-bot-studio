# AI Bot Studio

A local AI bot studio for creating, linking, and orchestrating bots into projects. This branch expands the project into a desktop app with multi-page dashboard, workflow orchestration, AI provider adapters, and user authentication.

## Included in this upgrade

- Electron desktop shell
- React multi-page dashboard
- Express API backend with SQLite persistence
- Bot creation and project linking
- AI provider abstraction for OpenAI, Anthropic, and Gemini
- Workflow graph builder for linking bot outputs to next steps
- Local authentication with JWT sessions
- Project export/upload workflows

## Stack

- Frontend: React, React Router, Vite, Tailwind-like CSS
- Desktop: Electron
- Backend: Express, TypeScript, SQLite
- Auth: bcryptjs + JWT
- AI providers: OpenAI, Anthropic, Gemini
- Flow orchestration: graph-based workflow builder

## Quick start

```bash
npm install
npm run dev
```

For the desktop app, run:

```bash
npm run start
```

## App structure

```text
apps/
  main/        # Electron shell
  renderer/    # React dashboard UI
  server/      # Express API and database
```

## Next steps

- Add OAuth providers
- Implement drag-and-drop workflow nodes
- Add real provider API calls with secret key management
- Add project sharing and cloud export
- Add team collaboration and permissions
