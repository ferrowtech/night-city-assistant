# Night City Assistant - PRD

## Original Problem Statement
Build a mobile-first web app called "Night City Assistant" - an AI gaming companion for Cyberpunk 2077 with dark cyberpunk UI, camera/gallery upload, Claude API integration with knowledge base, and multilingual tips.

## Architecture
- **Frontend**: React + Tailwind + Shadcn UI (single-page mobile-first)
- **Backend**: FastAPI + MongoDB + emergentintegrations (Claude Sonnet via Emergent LLM Key)
- **AI**: Claude Sonnet 4 (claude-sonnet-4-20250514) with Cyberpunk 2077 knowledge base

## User Personas
- Cyberpunk 2077 players seeking gameplay tips via screenshots
- Russian and English-speaking gaming communities

## What's Been Implemented (Feb 2026)
- Full cyberpunk UI with Orbitron/JetBrains Mono, glitch effects, grid background
- Camera capture + gallery upload
- Claude Sonnet integration with knowledge base from GitHub
- Language toggle (RU/EN) — tips delivered in selected language
- Share Hint — generates styled 1080x1080 cyberpunk PNG card, uses Web Share API or download fallback
- Settings dialog, loading animations, response card with HUD styling
- MongoDB history storage
- "Made with Emergent" badge hidden

## Prioritized Backlog
- P1: Chat history view (past analyses)
- P2: Prompt customization in settings
- P3: Multiple screenshot comparison
