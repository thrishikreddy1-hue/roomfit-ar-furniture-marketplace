# Buyer navigation settings

Sign in with an admin account, open **Overview → App settings**, and use the
**Private viewing** switch. Press **Save changes** to apply it to everyone.

- On (the default): buyers and guests can open the Private viewing tab.
- Off: the tab and its direct page are unavailable. An open Private viewing
  page redirects to Home when the app receives the new setting.
- Shop (the full catalogue), saved pieces, and individual product AR previews are unchanged.
- Turning it off deletes no products or other records. Turn it on to restore it.

Settings are stored in the database's `settings` collection. Only authenticated,
active admins can save changes through `PUT /api/admin/settings`. Public clients
read the safe boolean flag from `GET /api/settings`, with caching disabled. Local
development uses the same settings through the JSON-file adapter.

Buyer screens refresh settings through the existing event stream. On Vercel,
where streaming is unavailable, the app polls approximately every five seconds
while focused. A fresh page load also fetches the setting before navigation is
shown. No redeployment is needed when an admin changes the switch.

## Verification

1. Save Off as an admin. In a separate guest/buyer browser, verify that the tab
   disappears. Opening `/private-viewing` should return to Home.
2. Save On. Verify that the tab returns and opens normally.
3. Reload the browsers and confirm the saved choice remains.
4. Confirm a buyer/seller cannot open App settings or save settings via the API.

Admins also have a **Shop** tab for the same public catalogue buyers see. They can
open product/shop pages, save products, send enquiries about real listings, and
review shops after an enquiry. Their personal messages live under **Account → My
shopping messages**; marketplace-wide moderation remains under **Enquiries**.
Suspended shops stay out of the shopping catalogue. Sample previews are still
not for sale, and admin previews are excluded from shopper-interest counters.

Both admins and sellers have a **Home** tab with the public storefront, all
products, categories and shops. Their existing operations tabs remain available.
Seller catalogue browsing does not grant buyer-only wishlist/enquiry permissions.

The API regression test runs against both JSON-file and MongoDB adapters and
covers defaults, role restrictions, validation, persistence, public updates,
concurrent repeated saves, and restoring the option.
