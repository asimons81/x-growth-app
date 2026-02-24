# Pre-Merge Checklist (Main Branch)

Use this before merging anything to `main`.

## Required (hard gate)
- [ ] `npm ci`
- [ ] `npm run lint`
- [ ] `npm run build`
- [ ] Confirm CI is green on the PR

## App sanity checks
- [ ] Login works
- [ ] Mobile bottom nav switches tabs
- [ ] AI routes respond (`/api/ai/generate`, `score`, `voice-extract`)
- [ ] No foreign-language UI copy unless intentional

## Release checks
- [ ] Vercel deploy status is success
- [ ] Production URL renders latest commit
- [ ] Any schema/env changes documented in PR

## Security checks
- [ ] No secrets in commits/chat history
- [ ] New keys stored in env/credentials only
- [ ] Rotate any key accidentally exposed
