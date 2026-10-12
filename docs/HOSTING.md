# RoomFit live hosting

## Services

- Vercel project: `roomfit-ar-furniture-marketplace`, under `thrishikreddy1-hue`.
- MongoDB Atlas project: `RoomFit`, with the free `roomfit` cluster in Mumbai.
- Application database: `roomfit`.
- Database user: `roomfit-app`, limited to read/write access on this database and cluster.
- Vercel Blob store: `roomfit-uploads`, public, in Mumbai. Product photos and AR models can be viewed by anyone with their URLs.

The Atlas project's any-IP access rule was explicitly approved to accommodate Vercel's changing server addresses. TLS and database authentication are required. For fixed outbound IPs, restrict the access rule to those IPs.

## Production configuration

Configure these in the Vercel project's environment settings. Keep values out of Git and chat:

| Name | Purpose |
| --- | --- |
| `MONGODB_URI` | Secret connection URI for the application database user |
| `MONGODB_DB` | `roomfit` |
| `JWT_SECRET` | Secret server-side authentication signing key |
| `BLOB_READ_WRITE_TOKEN` | Connected upload store credential |
| `SEED_DEMO` | `false` for the live marketplace |

The frontend uses its own website origin for API calls. Do not configure `EXPO_PUBLIC_API_URL` unless intentionally hosting the API on a separate domain.

## Publishing an update

From the repository root:

```bash
npm test
npm run check:app
npx vercel --prod
```

The Vercel CLI must be signed in and the directory linked to this project. Changes pushed to GitHub deploy automatically only after the GitHub integration is connected; otherwise use the CLI command above.

## Verify the live site

1. Open `/api/health`. It should report `ok: true`, `database: "mongo"`, and `demoMode: false`.
2. Register a buyer and a seller, set up a shop, and upload a product photo.
3. Reopen the site and confirm accounts, enquiries, wishlist, and products persist.
4. Verify a shop enquiry reaches the right seller and unrelated accounts cannot access it.
5. Complete the [phone AR checklist](DEVICE_TESTING.md) after an admin attaches a suitable model.

The live database started empty; an explicitly requested [sample catalogue](SAMPLE_CATALOGUE.md) supplies illustrative furniture without creating demo credentials. Admin accounts require a separate setup with the intended administrator's credentials. Never seed a live database: the seed script resets its records.

## Limits

The upload API caps hosted files at 4 MB. Use an external model URL for larger GLB files. On Vercel, live updates fall back to periodic refreshes. Confirm hosting/storage usage limits and service terms in the account dashboards before scaling traffic.
