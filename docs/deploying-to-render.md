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
   | `STRIPE_WEBHOOK_SECRET` | See [Stripe webhook](#stripe-webhook) below (`whsec_...`) |
   | `AWS_ACCESS_KEY_ID`, `AWS_ACCESS_KEY_SECRET` | AWS IAM user with access to the `desmondecommercesite` S3 bucket |

   `JWT_SECRET` is generated automatically. `BASE_URL`, `BUCKET_NAME`, `AWS_REGION`, `CURRENCY` and `SHIPPING_COUNTRIES` are set in `render.yaml`.

   If the service already existed before a variable was added to `render.yaml`, add it by hand: **ourbestside-api** → **Environment** → **Add Environment Variable**. Render only prompts for `sync: false` values when a Blueprint is first applied.
4. Wait for the deploy to finish. The logs should show `Connected to mongoDB` and `Now listening to port ...`.
5. Copy the service URL, e.g. `https://ourbestside-api.onrender.com`.

## Point the frontend at it

1. Netlify → **ourbestside** → **Project configuration** → **Environment variables**.
2. Set **Key** `VITE_BASE_URL` and **Value** to the Render URL, with no trailing slash.
3. **Deploys** → **Trigger deploy** → **Clear cache and deploy site**.
   Vite bakes `VITE_*` values in at build time, so a redeploy is required.

## Stripe webhook

Orders are recorded as **paid** only when Stripe calls the backend's webhook. Without it, checkout still takes payment, but orders stay "Awaiting payment" and never show up in order history.

1. Stripe dashboard (in **Test mode**) → **Developers** → **Webhooks** → **Add endpoint**.
2. **Endpoint URL:** `https://<your-render-service>.onrender.com/checkout/webhook`
3. **Events to send:**
   - `checkout.session.completed`
   - `checkout.session.async_payment_succeeded`
   - `checkout.session.expired`
4. Save, then click **Reveal** under **Signing secret** and copy the `whsec_...` value.
5. On Render, set `STRIPE_WEBHOOK_SECRET` to that value and save. The service redeploys.
6. Test: make a purchase with card `4242 4242 4242 4242`, any future expiry and any CVC. The order should appear under **Account → Orders** as **Paid**, and in **Dashboard → Manage Orders**.

Test mode and live mode have separate endpoints and secrets. When you switch to live keys, create the endpoint again in live mode.

### Testing locally

Install the [Stripe CLI](https://docs.stripe.com/stripe-cli), then run:

```bash
stripe listen --forward-to localhost:8000/checkout/webhook
```

Put the `whsec_...` it prints into `server/.env` as `STRIPE_WEBHOOK_SECRET`.

## Products and images (S3)

**Access keys.** Render needs `AWS_ACCESS_KEY_ID` and `AWS_ACCESS_KEY_SECRET` for an IAM user limited to the bucket. Recommended inline policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject"],
      "Resource": "arn:aws:s3:::desmondecommercesite/*"
    }
  ]
}
```

An old secret key can't be recovered or paired with a new key ID. If it's lost, create a new access key under **IAM → Users → Security credentials**.

**Private bucket, signed image links.** The bucket does **not** need to be public; leave **Block all public access** turned on. Every product image on the site loads from the API (`GET /products/image/<key>`), which answers with a redirect to a signed S3 link valid for 1 hour. Browsers cache that redirect for 55 minutes. Stripe's checkout page gets links valid for 24 hours. This uses the key's `s3:GetObject` permission.

If images don't show:
1. Open `https://<render-service>.onrender.com/products/image/<key>` in the browser, using the `image` value of a product from MongoDB.
   - **A photo:** the backend and S3 are fine. Check that Netlify's `VITE_BASE_URL` points at Render, and redeploy Netlify.
   - **`AccessDenied`:** the IAM user is missing `s3:GetObject` on `desmondecommercesite/*`.
   - **`NoSuchKey`:** the upload didn't reach S3. Check the Render logs for the upload.
   - **`SignatureDoesNotMatch` or `InvalidAccessKeyId`:** `AWS_ACCESS_KEY_ID` and `AWS_ACCESS_KEY_SECRET` on Render don't belong together.
2. Changed a key or permission? Save on Render and wait for the redeploy.

**Restoring products.** An empty database means blank product pages. Run the seed script from your computer; it recreates the 8 featured products. See `docs/product-catalogue.md`.

```bash
npm run seed -w server -- --dry-run
npm run seed -w server
```

**Costs.** A few MB of images costs well under $0.01 a month in S3. Set up **Billing → Budgets → Zero spend budget** to get an email if anything starts charging.

## MongoDB Atlas checklist

- **Network Access** must include `0.0.0.0/0`. Render's free services don't have fixed outbound IPs.
- If the password contains `@ : / ? # %`, URL-encode it or change it to letters and numbers only.
- New users are created with `isAdmin: false`. To make an admin, open **Browse Collections** → `users` and set `isAdmin` to `true`.

## Things to know about Render's free plan

- The service sleeps after about 15 minutes without traffic. The first request after that takes around 30–60 seconds while it wakes up.
- Changing an environment variable in the dashboard triggers a redeploy.
- Pushes to the default branch redeploy automatically (Blueprint auto-deploy).
