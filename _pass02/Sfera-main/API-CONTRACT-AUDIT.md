# SFERA — API contract audit / integration pass

## Scope

This pass checks the real production path used by `server/server.js` and the existing frontend, without replacing page-specific UI/design.

## Fixed in this pass

1. **Production HTTP + Socket.IO server**
   - `server/server.js` now creates one HTTP server and attaches the production Socket.IO gateway.
   - `app.set('io', io)` makes the socket instance available to controllers.
   - This removes the previous situation where `server.js` imported Socket.IO but never attached it.

2. **Route naming contract**
   - The auto-loader now exposes `userRoutes.js` as `/api/users`, matching the frontend contract (`/api/users/profile`).
   - Existing route names remain unchanged for other modules.

3. **Socket authentication + signaling**
   - JWT is verified during Socket.IO handshake.
   - Personal rooms use the authenticated `userId`, not a client-supplied identity.
   - Messaging, presence and WebRTC signaling are handled by one production socket gateway.
   - `register_user` remains as a compatibility event but cannot change the authenticated identity.

4. **Bank balance response contract**
   - Backend returns `{ success, data: { balance, currency } }`.
   - Frontend now reads `response.data` instead of treating the whole response as a wallet.
   - TM Coin is not falsely read from the TM Bank endpoint.

5. **Marketplace listing contract**
   - `Listing.images` is an array of objects `{ url, public_id? }`.
   - Frontend now sends `{ url }` objects.
   - `segment` is now persisted in the Listing schema because the frontend already uses `b2c/b2b/b2g`.
   - Client-supplied seller identity is no longer trusted for creation.
   - Deletion requires listing ownership or admin role.
   - Failed server mutations are no longer reported as successful local mutations.

6. **Mail request path**
   - Mail sending now uses the central `window.api.request('/mail/send')` gateway instead of a page-specific raw fetch.
   - A duplicate JavaScript declaration in `mailtm.html` was removed.

7. **Messenger integration foundation**
   - Socket.IO client and SFERA socket service are loaded on the messenger page.
   - The messenger now loads real dialogs from `GET /api/chat/dialogs` for an authenticated user.
   - Selecting a real MongoDB user dialog loads messages from `GET /api/chat/:userId`.
   - Sending a real message uses `POST /api/chat/send`; the Socket.IO gateway distributes the saved message in real time.
   - The old mock data remains only as a fallback when no authenticated API session/data is available.

## Current contract map

| Module | Frontend | Backend | Status |
|---|---|---|---|
| Auth | `/auth/login`, `/auth/register` | `/api/auth/*` | CONNECTED |
| Profile | `/users/profile` | `/api/users/profile` | CONNECTED |
| Bank | `/bank/balance` | `/api/bank/balance` | CONNECTED |
| Marketplace catalog | `/marketplace` | `/api/marketplace` | CONNECTED |
| Marketplace create/delete/order | `/marketplace...` | `/api/marketplace...` | CONNECTED |
| Messenger dialogs | `/chat/dialogs` | `/api/chat/dialogs` | CONNECTED |
| Messenger messages | `/chat/:userId`, `/chat/send` | `/api/chat/...` | CONNECTED |
| Socket.IO | backend origin | production Socket.IO | CONNECTED |
| Mail send | `/mail/send` | `/api/mail/send` | CONNECTED |
| TM Pay | currently localStorage | backend `/api/payment/*` exists | NOT YET CONNECTED |
| TM Coin | currently localStorage | no matching persistent coin API | NOT YET CONNECTED |
| AI UI | currently local/demo logic | `/api/ai/predictions` exists | NOT YET CONNECTED |

## Important findings for the next pass

- `server/src/app.js` is not the process entrypoint on Render; `server/server.js` is. Do not fix production behavior only in `src/app.js`.
- The current TM Pay and TM Coin pages are local-state simulations despite backend financial endpoints existing. They must be integrated only after their exact business contracts are defined.
- Internal SFERA Mail persistence is not implemented by `mailController`; its current `/api/mail/send` contract sends through Resend. MongoDB `Mail` records are a separate unfinished integration.
- WebRTC signaling is now attached to the real production Socket.IO server, but the messenger UI still needs a real `RTCPeerConnection` offer/answer/ICE/media lifecycle before calls can be considered end-to-end production complete.
