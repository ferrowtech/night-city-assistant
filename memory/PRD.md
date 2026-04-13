# Night City Assistant - PRD

## Original Problem Statement
Build a mobile-first web app called "Night City Assistant" - an AI gaming companion for Cyberpunk 2077 with dark cyberpunk UI, camera/gallery upload, Claude API integration with knowledge base, and multilingual tips.

## Architecture
- **Frontend**: React + Tailwind + Shadcn UI (single-page mobile-first)
- **Backend**: Netlify Serverless Functions (Node.js) — `analyze.js`, `health.js`, `history.js`
- **AI**: Claude Sonnet 4 (claude-sonnet-4-20250514) via direct Anthropic API (`fetch`)
- **Logging**: Notion API (database `27adb0059c7e44cbb54eebffada993d1`)
- **Rate Limiting**: In-memory (5 req/day per IP); promo code `NIGHTCITY2077` bypasses limit

## User Personas
- Cyberpunk 2077 players seeking gameplay tips via screenshots
- Russian and English-speaking gaming communities

## What's Been Implemented (Feb 2026)
- Full cyberpunk UI with Orbitron/JetBrains Mono, glitch effects, grid background
- Camera capture + gallery upload with client-side compression (max 1280px / 3MB)
- Claude Sonnet 4 integration with knowledge base fetched from GitHub (`ferrowtech/night-city-assistant`)
- Language toggle (RU/EN) — tips delivered in selected language
- Share Hint — generates styled 1080x1080 cyberpunk PNG card, uses Web Share API or download fallback
- Settings dialog, loading animations, response card with HUD styling
- IP-based rate limiter (5 req/day) + Stripe payment link when limited
- Backend promo code validation (`NIGHTCITY2077`) bypasses rate limits
- Notion API logging of queries
- Migrated backend from FastAPI/MongoDB to Netlify Serverless Functions
- Removed all Emergent branding
- **CORS restricted**: `Access-Control-Allow-Origin` uses `ALLOWED_ORIGINS` env var (fallback: `https://cyberpunk-assistant.netlify.app`) in all three Netlify functions

## Prioritized Backlog
- P1: Persistent rate limiter (replace in-memory with Redis/Upstash KV for production Lambda cold-start safety)
- P2: Chat history view (past analyses)
- P3: Prompt customization in settings
- P4: Multiple screenshot comparison
- Cleanup: Remove deprecated `server.py`
