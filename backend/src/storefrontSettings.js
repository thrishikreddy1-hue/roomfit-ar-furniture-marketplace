const db = require('./db');

async function storefrontSettings() {
  const settings = await db.settings.byId('storefront');
  // Existing installations keep Private viewing until an admin explicitly hides it.
  return { privateViewingEnabled: settings?.privateViewingEnabled !== false };
}

module.exports = { storefrontSettings };
