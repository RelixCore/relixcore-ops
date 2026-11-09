# Communications setup

## Included in this change

- General team chat, private groups, membership management, paged history,
  replies, explicit @mentions, Drive links, deletion and unread indicators.
- Chat refreshes every 8 seconds while visible; the navigation badge refreshes
  every 20 seconds. This release does not use a WebSocket service.
- Administrators can connect their own Google account, link folders to rooms
  they belong to, scan on demand, and schedule repeat scans.
- WhatsApp is explicitly **not connected**. Do not describe it as a working inbox.

## Database and release

Apply the checked-in migration with `npx prisma migrate deploy`, then build and
deploy normally. The migration creates the General room. It does not change
existing members, leads, avatars or checklist records. The existing avatar
partial unique index is preserved.

## Connect a regular Google account

1. Open https://console.cloud.google.com/ and create a project for RelixCore Ops.
2. Enable **Google Drive API** in APIs & Services → Library.
3. Configure Google Auth Platform consent/branding. For a regular Gmail account,
   use an External audience. During testing, add the connecting Gmail address
   as a test user. Add the metadata-only scope:
   `https://www.googleapis.com/auth/drive.metadata.readonly`.
4. Create an OAuth client of type **Web application**. Add this exact authorized
   redirect URI:
   `https://relixcore-ops.vercel.app/api/integrations/google/callback`.
   For local testing, separately add
   `http://localhost:3000/api/integrations/google/callback`.
5. Set these **server-only** environment variables in the deployment settings:

   | Variable | Value |
   | --- | --- |
   | `APP_URL` | `https://relixcore-ops.vercel.app` |
   | `GOOGLE_CLIENT_ID` | OAuth web-client ID |
   | `GOOGLE_CLIENT_SECRET` | OAuth web-client secret |
   | `DRIVE_TOKEN_KEY` | 32 random bytes encoded as base64; keep this stable |
   | `CRON_SECRET` | A separate long random secret for scheduled requests |

   Store secrets directly in Vercel; do not paste them into chat, commit them,
   or prefix them with `NEXT_PUBLIC_`. Keep a secure backup of `DRIVE_TOKEN_KEY`:
   changing it requires reconnecting Google accounts. Refresh tokens are stored
   encrypted with AES-256-GCM and never passed to the browser.
6. Redeploy, sign into Ops as an administrator, open **Integrations**, and click
   **Connect Google Drive**. Google will ask the account owner to grant consent.
7. Paste a folder link, choose a chat group, and optionally include subfolders.
   Folder names/change summaries become visible to that group's members.
8. Click **Check now** to establish a baseline. Subsequent checks post changes.
   Test with a disposable folder: add/rename/edit/move/remove a test file, then
   check again and confirm one summary in the chosen group. Recheck without
   changes and confirm no duplicate. Revoke access and confirm a visible error
   rather than a false mass-deletion alert.

The metadata scope can require Google's app verification for production use.
External apps left in Testing can receive refresh tokens that expire after
seven days. Review Google's current requirements before treating the connection
as unattended production infrastructure:
https://developers.google.com/identity/protocols/oauth2/web-server
https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification

This integration reads names, parents, modification times and account identity.
It does not download file contents, upload files, or grant recipients access.
Chat currently shares existing Drive links; a Drive file-picker/upload workflow
is not included.

## Schedule folder checks

The handler is `GET /api/cron/drive`. It requires
`Authorization: Bearer <CRON_SECRET>`. Requests with missing/wrong secrets are
rejected. Use a trusted scheduler that stores the header securely.

For a Vercel plan supporting the desired frequency, merge this into `vercel.json`
after confirming the plan's cron limits:

```json
{"crons":[{"path":"/api/cron/drive","schedule":"*/5 * * * *"}]}
```

Vercel sends the configured `CRON_SECRET` to the handler. If the plan cannot run
every five minutes, use an appropriate external scheduler or change plans. No
schedule is enabled merely by deploying the handler.

Each invocation checks the three least-recently-attempted watches, preventing
one inaccessible folder from starving the others. Actual latency depends on
watch count and schedule frequency. Each watch supports up to 2,000 items and
100 folders, with a bounded scan duration. Larger collections should be split.

The first successful scan is a baseline, not an alert storm. Later scans compare
metadata and post a summary. Lease tokens prevent overlapping scans from
committing competing snapshots; snapshot and message commit atomically. An
incomplete/failed scan keeps the previous snapshot for retry. A file absent from
a successful listing is described as "no longer in folder or accessible": it
may have moved, been deleted, or become inaccessible. This is not an audit of
every keystroke or every intermediate change between scans. Short-lived changes
may not be observed. Renames take precedence over an update in the same scan.

Disconnecting deletes stored credentials and watches and attempts to revoke
Google's token. Removing a member also removes their connection and watches.
Monitoring pauses if the connected administrator loses their admin role or
membership of the destination private group.

## WhatsApp decision still required

Your requirement is existing and new client groups, with clients remaining on
WhatsApp and staff replying inside Ops. An ordinary group invite link does not
provide that integration.

The official provider documentation reviewed on 9 November 2026 requires an
Official Business Account for the Groups API, lists a small participant limit,
and excludes Business-app coexistence numbers:
https://docs.360dialog.com/docs/messaging/groups.md
https://help.commbox.io/docs/whatsapp-groups

You confirmed that these groups belong to a regular WhatsApp app account.
Unipile is a candidate: its documentation describes QR-code linking of regular
accounts, existing group conversations, group creation and sending messages:
https://developer.unipile.com/docs/connect-accounts
https://developer.unipile.com/v2.0/docs/whatsapp-send-messages
https://www.unipile.com/whatsapp-group-api/

Unipile describes itself as an independent intermediary, not a Meta partner:
https://www.unipile.com/whatsapp-api-providers/
Its documented exclusions include communities, channels and broadcasts:
https://developer.unipile.com/v2.0/docs/whatsapp-unsupported-features

This option has not been connected or tested with your account. Before
implementing an inbox, agree on the provider and costs, then verify existing
group support, onboarding, message/webhook API and group limits with a test
account. Any provider using a linked-device session
instead of Meta's official group interface needs a separate reliability,
credential-access and WhatsApp-policy review. Do not register a provider, move
the business number, invite clients, or send client messages as part of testing.

## Authorization

- Every read/write rechecks the session and room access; private room IDs alone
  do not confer access. General is available to all current team members.
- A group creator, or a site administrator who is a member, manages membership.
- Only a sender or a site administrator in the conversation removes messages.
- Mentions and replies must belong to the same accessible conversation.
- Google connection/settings are administrator-only and scoped to that admin.
- Existing member removal still works: memberships cascade, author/owner links
  become null, message author-name snapshots remain in history.

## Local regression checks

Run `npm run test:communications`. This creates an in-memory PostgreSQL-compatible
database on localhost port 55441, applies every migration, and exercises the
actual chat actions and Drive scan logic. It overrides the database URL for the
test process and does not modify the production database. Google responses and
the signed-in test identity are fixtures; live OAuth consent and scheduled
delivery still require the setup and account-level checks above.
