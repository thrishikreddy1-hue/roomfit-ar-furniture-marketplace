# Run RoomFit step by step

## 1. Get the project

Install Git and Node.js 22. Clone the repository, then enter its folder:

```bash
git clone https://github.com/thrishikreddy1-hue/roomfit-ar-furniture-marketplace.git
cd roomfit-ar-furniture-marketplace
```

## 2. Install dependencies

Run from the project root:

```bash
npm run install:all
```

This installs the backend and mobile dependencies from their lockfiles.

## 3. Start the API

In your first terminal:

```bash
npm run dev:api
```

The API runs on `http://localhost:4000`. In local development it uses a JSON database under `backend/data/` and creates demo data when empty.

## 4. Start the app

Open a second terminal in the same project folder:

```bash
npm run dev:app
```

Press `w` for the browser. For phone testing, keep the phone on the same Wi-Fi and use an Expo client compatible with the project's SDK. Local API detection uses the Metro host; a deployed API can be set using `EXPO_PUBLIC_API_URL` in `mobile/.env.local`.

## 5. Try each role

Local demo accounts use password `password123`:

| Role | Email | What to try |
| --- | --- | --- |
| Buyer | `buyer@roomfit.test` | Discover products, check dimensions, save pieces, send an enquiry |
| Seller | `seller@oakandloom.test` | Edit listings, manage photos, review enquiries |
| Admin | `admin@roomfit.test` | Manage 3D models and shop accounts |

Demo accounts are for local testing. Review the production configuration in the main README before deploying.

## 6. Verify changes

```bash
npm test
npm run check:app
```

The root test command runs backend tests using the local adapter and a temporary MongoDB instance, AR event-handler tests, and mobile availability tests. The first MongoDB test run may download a large binary. The app check runs lint, the configured TypeScript check, and a web export to `mobile/dist/`.

## 7. Understand what GitHub stores

GitHub stores source code, documentation, and dependency lockfiles. Local database records, uploaded photos/models, dependency folders, environment secrets, and generated builds are excluded. Configure MongoDB and upload storage separately for production.

## 8. Save future changes

```bash
git status
git add path/to/changed-file
git commit -m "Describe the change"
git push origin main
```

Use a branch and pull request for larger changes. See [Contributing](../CONTRIBUTING.md).
