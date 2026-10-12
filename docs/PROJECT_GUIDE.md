# Understand the project

## Folder map

| Folder | Responsibility |
| --- | --- |
| `mobile/src/app/` | Buyer, seller, and admin screens with Expo Router |
| `mobile/src/components/` | Shared cards, forms, uploads, and 3D previews |
| `mobile/src/lib/` | API calls, AR launch helpers, dimensions, and live updates |
| `mobile/src/theme.js` | Shared colours, spacing, corners, and shadows |
| `backend/src/routes/` | Authentication, catalogue, shops, enquiries, wishlist, reviews, and admin API |
| `backend/src/db.js` | JSON and MongoDB persistence adapters |
| `backend/src/arPage.js` | Browser-based 3D and AR viewer |
| `backend/test/` | Backend integration tests |
| `api/` | Vercel API entry point |
| `docs/` | Setup and project explanations |

## How a buyer enquiry works

1. The buyer browses products loaded from the Express API.
2. A product page displays photos, dimensions, and available 3D/AR models.
3. The buyer sends contact details and a message to the shop.
4. The API stores the enquiry and sends a live update to the relevant accounts.
5. The seller contacts the buyer and updates the enquiry status.

RoomFit uses enquiries rather than a checkout or payment system.

## Current feature foundations

- Buyers can save products to their account's wishlist.
- Sellers can set available, reserved, or sold status and shop delivery details.
- Seller analytics track explicit product-page visits, taps on the AR placement button, and confirmed WebXR session starts separately. External Scene Viewer and Quick Look apps do not report placement success back to this page. Counters measure events, not unique people.
- Sellers can move photos earlier in the list; the first photo is the cover.
- Signed-in buyers who have enquired with a shop can submit or update a shop review. This checks an enquiry relationship, not a verified purchase.

## Where to make changes

For visual styling, start with `mobile/src/theme.js` and the relevant screen. For new API behavior, start with `backend/src/routes/` and update `mobile/src/lib/api.js`. Keep persistence changes compatible with both adapters in `backend/src/db.js`.

## Verification and remaining device checks

`npm test` runs backend integration tests with JSON and MongoDB, viewer event-handler tests, and availability-label tests. `npm run check:app` runs lint, TypeScript configuration checks, and the web export. This JavaScript app uses selective `@ts-check` for annotated helpers; it is not fully type-checked yet.

See [Device testing](DEVICE_TESTING.md) before shipping changes to AR.

## Suggested next milestones

- Add UI automation for complete buyer and seller journeys.
- Track distinct visitors and add analytics abuse protection.
- Add review moderation and pagination.
- Test buyer and seller flows on physical Android and iOS devices.

The setup guide explains how to reproduce the existing automated checks; successful builds alone do not establish complete device coverage.
