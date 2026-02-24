# Secrets Policy (Phase 4)

## Rules
1. Never paste API keys/tokens in chat.
2. Never commit secrets to git.
3. Store runtime secrets in Vercel env vars (production) or local `.env.local` (dev only).
4. Rotate any key that is ever exposed in chat/logs.

## Required Secret Locations
- Production: Vercel Project Environment Variables
- Local dev: `.env.local` (gitignored)
- Optional central store: `~/.openclaw/credentials/*.env`

## Rotation Protocol
If a key is exposed:
1. Revoke/rotate at provider immediately
2. Update Vercel env value
3. Update local `.env.local`
4. Redeploy and test affected endpoints

## Current action required
- Rotate Gemini API key that was posted in chat.
