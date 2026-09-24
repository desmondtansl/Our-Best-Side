# Deploying the backend to Render

The React frontend is hosted on Netlify. The Express API in `server/` runs as a long-lived Node process, which Netlify doesn't support, so it runs on [Render](https://render.com) instead. `render.yaml` at the repo root is a Render Blueprint that describes the service.

## First-time setup

1. Sign in to Render with GitHub and give it access to this repository.
2. Go to **New** → **Blueprint** → choose this repo → **Apply**.
   Render creates a free web service called `ourbestside-api`, with root directory `server`, build command `npm ci --omit=dev` and start command `npm start`.
3. Render asks for the values marked `sync: false`:

   | Variable | Where to get it |
   |----------|-----------------|
   | `MONGO_URI` | Atlas → cluster **OurBestSide** → **Connect** → **Drivers**. Use the format in `server/.env.example`, with the real password and `/ourbestside` before the `?`. |
   | `STRIPE_PRIVATE_KEY` | Stripe dashboard → Developers → API keys (use the test key `sk_test_...`) |
   | `AWS_ACCESS_KEY_ID`, `AWS_ACCESS_KEY_SECRET` | AWS IAM user with access to the `desmondecommercesite` S3 bucket |

   `JWT_SECRET` is generated automatically. `BASE_URL`, `BUCKET_NAME` and `AWS_REGION` are set in `render.yaml`.
4. Wait for the deploy to finish. The logs should show `Connected to mongoDB` and `Now listening to port ...`.
5. Copy the service URL, e.g. `https://ourbestside-api.onrender.com`.

## Point the frontend at it

1. Netlify → **ourbestside** → **Project configuration** → **Environment variables**.
2. Set **Key** `VITE_BASE_URL` and **Value** to the Render URL, with no trailing slash.
3. **Deploys** → **Trigger deploy** → **Clear cache and deploy site**.
   Vite bakes `VITE_*` values in at build time, so a redeploy is required.

## MongoDB Atlas checklist

- **Network Access** must include `0.0.0.0/0`. Render's free services don't have fixed outbound IPs.
- If the password contains `@ : / ? # %`, URL-encode it or change it to letters and numbers only.
- New users are created with `isAdmin: false`. To make an admin, open **Browse Collections** → `users` and set `isAdmin` to `true`.

## Things to know about Render's free plan

- The service sleeps after about 15 minutes without traffic. The first request after that takes around 30–60 seconds while it wakes up.
- Changing an environment variable in the dashboard triggers a redeploy.
- Pushes to the default branch redeploy automatically (Blueprint auto-deploy).
