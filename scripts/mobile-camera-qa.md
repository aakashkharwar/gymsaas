Mobile Camera QA & Sync Test Plan

Purpose
- Verify camera scanning, kiosk continuous mode, and server sync behavior on real mobile devices (iOS/Android).
- Document test steps, expected results, and troubleshooting notes so operators can reproduce and validate.

Preconditions
- Dev server accessible from the mobile device. Options:
  - Serve over LAN (e.g., dev machine IP: http://192.168.1.10:3000) and open same URL on phone browser.
  - Use ngrok: `ngrok http 3000` and open provided HTTPS URL on phone (recommended for iOS camera permissions).
- If using ngrok, ensure HTTPS URL is used (camera on iOS requires secure context).
- If DEMO_SERVER_TOKEN is configured, have the token handy for admin UI fetches and sync tests.

Files/URLs
- Scanner UI: /dashboard/attendance (use "Open Scanner Mode")
- QR Generator: /dashboard/attendance/generate
- Admin debug UI: /dashboard/attendance/server-debug
- Sync endpoint: POST /api/attendance/sync

Test checklist
1) Basic QR scanning (single-scan flow)
   - On desktop: open /dashboard/attendance in mobile emulation and verify camera opens and scans a printed QR. Expected: form opens with qr prefilled.
   - On real phone (HTTPS/ngrok): open the app, go to /dashboard/attendance, click "Open Scanner Mode" → "Use Camera" and scan a QR. Expected: attendance form opens with QR and member prefill (if token/member mapping exists). After submit, record appears in local attendance list and syncStatus set to pending (if offline) or synced (if online).

2) Kiosk continuous mode
   - On phone or tablet in landscape, open /dashboard/attendance, click "Open Scanner Mode", then "Use Camera". Toggle "Kiosk: ON".
   - Present multiple QR codes in sequence. Expected: each accepted scan creates a record immediately (syncStatus: pending), recent scans feed updates, transient toast shown unless Silent ON. Duplicate scans within 5s are ignored and show "Duplicate scan ignored".
   - Verify recent-scans feed shows up to 6 items.

3) Offline behavior
   - Disable network (airplane mode) or block network. Perform scans in kiosk mode. Expected: records persist locally and show syncStatus: pending.
   - Re-enable network. Expected: records are attempted to be synced (onOnline event triggers attemptSync) and status transitions to synced or duplicate/failed based on server results.

4) Server sync and org scoping
   - In admin UI (/dashboard/attendance/server-debug), set Org ID matching client (client sends x-org-id header automatically? If not, include org in POST body or set header in client calls). Use Demo token if configured.
   - Test POST:/api/attendance/sync using curl:
     curl -X POST https://<HOST>/api/attendance/sync \
       -H "Content-Type: application/json" \
       -H "Authorization: Bearer <DEMO_SERVER_TOKEN>" \
       -H "x-org-id: myorg" \
       -d '{"records":[{"id":"test-1","qrCode":"TEST-QR","date":"2026-08-16","entryTime":"07:30","createdAt":"2026-08-16T07:30:00Z"}]}'
   - Expected: response 200 with results array containing status 'synced'. Admin UI should display the inserted record when orgId set to 'myorg'.

5) Migration/DB verification
   - If migration was performed, check .data/attendance.db exists and/or .data/attendance_migration.sql was imported.
   - Use sqlite3 CLI to inspect: `sqlite3 .data/attendance.db "SELECT count(*) FROM attendance;"`

Troubleshooting notes
- Mobile camera not opening or permission denied:
  - Ensure page is served over HTTPS (ngrok) or local LAN and browser allows camera.
  - On iOS Safari: camera only works on HTTPS; if using localhost tunneling ensure TLS.
  - If the app was opened via a link and camera doesn't open automatically, ask user to click the "Use Camera" button (user gesture required on many browsers).

- BarcodeDetector vs jsQR fallback:
  - Some older Android browsers may not support BarcodeDetector; jsQR fallback is used but may be slower. For best results, use Chrome on Android or Safari on iOS (HTTPS).

- Auth 401 when fetching server rows:
  - Ensure DEMO_SERVER_TOKEN (server) matches the token entered in admin UI. The UI sends Authorization: Bearer <token> and x-api-key: <token> as fallback.

Post-test steps
- Collect sample failing cases (screenshots or device logs) and record the scenario in this file under "Failures" with timestamp.
- If many duplicates appear, consider tuning DUP_MS or debounceMs in CameraScanner/attendance page.

Manual verification script (quick)
1. Start dev server on port 3000.
2. Run: node scripts/migrate-attendance-to-sqlite.js (optional) and import if desired.
3. Start ngrok: ngrok http 3000 (copy HTTPS URL)
4. On phone open: https://<ngrok>/dashboard/attendance
5. Run through steps 1-4 above and record results.

Failures:
- (Add entries during testing)
