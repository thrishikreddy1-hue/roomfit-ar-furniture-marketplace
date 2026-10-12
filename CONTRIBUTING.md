# Contributing to RoomFit

Start with [Getting started](docs/GETTING_STARTED.md) and [Project guide](docs/PROJECT_GUIDE.md).

## Propose a change

Open an issue describing the problem, the affected screen or API, and the expected behavior. For bugs, include reproduction steps, device/browser, and relevant error messages without passwords or tokens.

## Work on a branch

```bash
git checkout -b feature/short-description
```

Keep changes focused. Preserve the buyer, seller, and admin access boundaries. New persistence behavior must work with both the JSON and MongoDB adapters. Follow any `AGENTS.md` instructions in the area you edit.

## Check and submit

Run the checks relevant to your change:

```bash
npm test
npm run check:app
```

Commit the change, push your branch, and open a pull request describing the resulting behavior and how you tested it. Never commit `.env` secrets, runtime customer records, uploaded assets, or `node_modules`.

The repository currently includes a license under `mobile/LICENSE`; it does not establish licensing for every part of the project. Confirm the applicable licensing before redistributing other parts.
