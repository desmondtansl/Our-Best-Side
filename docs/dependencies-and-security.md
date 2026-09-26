# Dependency Vulnerabilities: Checking & Fixing

Render's build log showed:

```
30 vulnerabilities (3 low, 12 moderate, 14 high, 1 critical)
```

That summary comes from `npm install` / `npm ci`. npm compares every installed package against GitHub's advisory database and counts the known problems.

## How to check

From the repo root (needs Node.js):

```bash
cd server
npm audit --omit=dev --workspaces=false   # exactly what Render installs
cd ../client
npm audit --omit=dev --workspaces=false   # what ships to shoppers' browsers
npm audit --workspaces=false              # also includes test/build tools
```

- `--omit=dev` leaves out test and build tools, which never run on the live site.
- `--workspaces=false` checks that folder's own `package-lock.json`, the file Render and Netlify install from.
- Each finding lists:
  - the package and its severity
  - a link to the advisory
  - whether `npm audit fix` can fix it safely (same major version), or only `npm audit fix --force` can (a major upgrade that may break things)

**Fixing:**

```bash
npm audit fix --workspaces=false   # safe updates only; commit the updated package-lock.json
```

Avoid `npm audit fix --force` unless you're prepared to test a major upgrade. After any update, run `npm test` and `npm run build` before deploying.

**Automatic alerts (recommended):** GitHub → repo **Settings** → **Code security** → turn on **Dependabot alerts** and **Dependabot security updates**. GitHub then emails you about new advisories and opens pull requests with fixes.

## What was fixed (server, deployed on Render)

| Package | Before | After | Severity fixed |
|---------|--------|-------|----------------|
| `mongoose` | 6.9.0 | 6.13.11 | **critical** (and the MongoDB driver 4.13 → 4.17) |
| `express` | 4.18.2 | 4.22.3 | high (including `body-parser`, `path-to-regexp`) |
| `@aws-sdk/client-s3` | 3.259 | 3.1141 | moderate (including `fast-xml-parser`) |
| `jsonwebtoken` dependencies, `lodash`, `validator`, `semver`, … | | | Updated through the packages above |
| `nodemon` | production dependency | **dev dependency** (3.x) | high. A developer tool for auto-restarting the server; not needed on Render. Use `npm run dev -w server` locally. |
| `react-stripe-checkout` | production dependency | **removed** | Unused on the server |

**Result:** `npm audit --omit=dev` for the server reports **0 vulnerabilities**. That is the same install Render runs (`npm ci --omit=dev`).

## Client (Netlify)

| Package | Before | After |
|---------|--------|-------|
| `axios` | 1.2.x | 1.20.0 (high fixed) |
| `react-router-dom` | 6.6.x | 6.30.6 (high fixed) |
| `validator` | 13.7 | 13.15.35 (high fixed) |
| `vite` | 4.0.x | 4.5.14 (build tool; high fixed) |

**Remaining (not fixed, low risk here):**
- **`react-router` (2 moderate):**
  - *Open redirect via a backslash in `<Link>` / `useNavigate`.* This only matters when a link's destination comes from attacker-controlled input. All links here are fixed paths or IDs from our own database.
  - *SSR hydration bug.* This only affects server-side rendering with data routers, and the site renders in the browser with `BrowserRouter`.
  - Both are fixed in React Router **v7**, a major upgrade already on the Phase 4 list.
- **`vitest` (critical, test tool only):** it runs tests on developers' machines and is never part of the website. Fixing it needs a major upgrade (0.34 → 5.x), which also means upgrading Vite and the React plugin. Planned with the Phase 4 dependency upgrades.

## Verification
- **Server:** installed exactly as Render does (`npm ci` from `server/package-lock.json`); all **75** tests pass on the upgraded versions, and `npm audit --omit=dev` shows 0 vulnerabilities.
- **Client:** all **59** tests pass and the production build succeeds on the upgraded versions.
- **Root `package-lock.json`** (local development) was updated to the same versions.

## Also in this change
- **Homepage:** removed the out-of-date announcement bar ("Place your orders by 18th Jan'23 to receive it in time for CNY!"). The unused `client/src/components/Announcement.jsx` was deleted.
