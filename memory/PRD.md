# Night City Assistant - PRD

## Original Problem Statement
Build a mobile-first web app called "Night City Assistant" - an AI gaming companion for Cyberpunk 2077 with dark cyberpunk UI, camera/gallery upload, Claude API integration with knowledge base, and Russian language tips.

## Architecture
- **Frontend**: React + Tailwind + Shadcn UI (single-page mobile-first)
- **Backend**: FastAPI + MongoDB + emergentintegrations (Claude Sonnet via Emergent LLM Key)
- **AI**: Claude Sonnet 4 (claude-sonnet-4-20250514) with Cyberpunk 2077 knowledge base

## User Personas
- Cyberpunk 2077 players seeking gameplay tips via screenshots
- Russian-speaking gaming community

## Core Requirements
- [x] Dark cyberpunk UI with glitch title, neon yellow/red accents, grid background
- [x] Camera capture + gallery upload for screenshots
- [x] AI analysis via Claude with knowledge base context
- [x] Russian language tips output
- [x] Settings dialog with system info
- [x] Loading states with immersive terminal text
- [x] "Made with Emergent" badge hidden

## What's Been Implemented (Feb 2026)
- Full single-screen UI with Orbitron/JetBrains Mono fonts, glitch CSS effects
- Camera and gallery file inputs
- Backend /api/analyze endpoint with knowledge base fetch + cache
- Claude Sonnet integration responding in Russian
- MongoDB storage of analysis history
- Settings dialog, loading animations, response card with HUD styling

## Prioritized Backlog
- P1: Chat history view (past analyses)
- P2: Multiple language support toggle
- P3: Share hint as image feature
