# AR and mobile release checks

Automated tests exercise API permissions, saved state, product availability, delivery validation, photo ordering, review eligibility and totals, concurrent analytics updates, and browser AR event handlers. They do not establish camera tracking, model quality, or real-world placement accuracy.

## On an AR-capable Android phone

1. Use an HTTPS deployment and open a product with a working GLB model.
2. Rotate and zoom the embedded model, toggle dimensions, and reset the view.
3. Choose View in your room, then Place in my room. Allow camera access when prompted.
4. Find the floor (or wall for a wall listing), place the item, and walk around it.
5. Compare its apparent size with the listed measurements. Verify the warning appears for a deliberately mismatched model in a test environment.
6. Exit AR and retry. Check that launches increase only after placement-button taps; confirmed browser sessions are reported separately.

## On iPhone/iPad

Repeat the placement flow in Safari using Quick Look. Check both a supplied USDZ and a GLB converted by model-viewer. Confirm fallback guidance remains useful when AR is unavailable.

Quick Look and Android Scene Viewer are external applications: the browser can observe a launch request, but it cannot confirm placement inside those apps.

## Buyer and seller checks

- Save a product, leave it, reopen it, and verify the filled heart. Remove it from Saved pieces and revisit the product.
- Change a product to Reserved and Sold in the seller account. Check the buyer card and detail page agree even when stock is positive.
- Edit delivery areas, pickup, and assembly options. Confirm the buyer sees those settings.
- Reorder product photos. Confirm the cover matches after reopening. Simulate a network error and confirm the editor does not pretend the order was saved.
- Send an enquiry, submit a shop review, and edit it. Verify an unrelated buyer cannot review the shop. Review pagination must preserve the total count and average across all pages.

## Current evidence

Physical-device AR placement and production deployment configuration require verification on the intended deployment. Record the device, browser/client version, tested model, and outcome before a release.
