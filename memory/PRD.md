# Nidhii — Community Accountability System (PRD)

## Original problem statement
Design and develop a low-cost, community-driven platform named Nidhii that enables residents of informal settlements to track and reduce shared resource waste (water, energy, materials) without requiring high-end smartphones or constant internet access. Core flows: 10-digit virtual IVR with voice → STT → structured DB; React dashboard with weekly conservation graphs and Top-5 leaderboard; gamification (₹10 per 25 verified reports); multilingual AI assistant in 5+ Indian languages (text + voice); automatic Excel/CSV export for community leaders.

## Architecture
- **Backend**: FastAPI + Motor (MongoDB async). All routes under `/api`. JWT auth with bcrypt-hashed passwords.
- **Frontend**: React 19 + react-router-dom 7 + Tailwind + recharts. Civic-poster aesthetic (terracotta + green + saffron, Outfit/Manrope fonts, flat shadows + 2px slate-900 borders).
- **AI**: Gemini 3 Flash + OpenAI Whisper-1 via `emergentintegrations` library and Emergent Universal Key.
- **Telephony**: IVR fully simulated in-browser (Web Speech for voice prompts, MediaRecorder for voice complaints). No Twilio.
- **Excel sync**: CSV export endpoints (`/api/admin/export/reports.csv`, `/api/admin/export/users.csv`) — Excel-compatible, downloadable by admin/supervisor.

## User personas
1. **Resident** — files reports via web/voice/IVR, earns rewards.
2. **Supervisor** — verifies reports, exports area-level data.
3. **Admin** — full system view, both CSV exports, all reports.

## What's been implemented (29 Apr 2026)
- ✅ Landing page (hero, 3-step explainer, categories, leaderboard preview)
- ✅ JWT signup/login with role selector (resident/supervisor/admin) and 6 languages
- ✅ Dashboard (welcome card, 4 stat cards, weekly stacked bar chart, top-5 widget, recent reports, my-rank card)
- ✅ New Report (text + browser mic → Whisper → auto-extract name/address/issue type)
- ✅ IVR Simulator (dial pad, 1800-NIDHII number, multi-step menu, voice complaint flow, multilingual)
- ✅ Reports list with type/status/mine filters
- ✅ Leaderboard (3-tier podium + full ranked list with ₹ earned)
- ✅ Rewards (progress bar to next ₹10, totals)
- ✅ Sahayak multilingual chat (Gemini 3 Flash, 6 langs, text+voice w/ TTS playback)
- ✅ Admin verify queue (pending/verified/rejected/all tabs, Verify/Reject actions, CSV exports)
- ✅ 24/24 backend tests pass; frontend verified end-to-end (signup→dashboard, admin verify, IVR dial, chat en+hi)

## Iteration 2 (29 Apr 2026 — same day)
- ✅ **Real Twilio Voice IVR** — `/api/twilio/voice|gather|recording-done|recording-status` webhooks return valid TwiML (multilingual EN/HI based on `FromCountry`); Whisper transcribes recording then auto-creates a report. Stub mode active until `TWILIO_*` env vars filled.
- ✅ **Google Sheets two-way sync** — service-account based. On every report create/verify and user signup, rows are upserted in `Reports` and `Users` tabs of the configured spreadsheet. Admin can manually `Push all` or `Pull edits` (read manual status changes from the sheet back into Mongo). Stub mode until `GOOGLE_SHEETS_CREDS_JSON` and `GOOGLE_SHEETS_SPREADSHEET_ID` are set.
- ✅ **Area-based supervisor routing** — every report stores `area` from the resident. Supervisors only see reports matching their own `area` (case-insensitive); admins see all. Admin UI shows an Area filter chip when logged in as supervisor.
- ✅ **Integrations admin panel** — `/admin` page now has live status cards for Twilio + Sheets with stub/live indicators and the exact `.env` keys needed.
- ✅ 36/36 backend tests pass; frontend verified.

## Prioritized backlog
**P0 (next session)**
- Real Twilio integration for actual phone calls + DTMF
- Google Sheets API live two-way sync (currently CSV-only)
- Area-based supervisor routing (supervisor sees only their area's reports)

**P1**
- Photo upload on reports (object storage)
- Lifetime-verified counter for fully idempotent rewards (testing agent recommendation)
- Reward redemption workflow + payout audit trail
- Push/SMS notifications on verify

**P2**
- PWA / offline-first cache
- Map view of reports
- Weekly community digest email

## Test credentials
See `/app/memory/test_credentials.md`.
