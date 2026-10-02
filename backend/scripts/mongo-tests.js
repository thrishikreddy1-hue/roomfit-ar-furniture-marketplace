// Runs the API test suite against a throwaway in-memory MongoDB (the production adapter).
const { spawnSync } = require('child_process');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');

(async () => {
  // Keep the downloaded test binary inside the project rather than requiring
  // write access to the current user's profile cache.
  const downloadDir = process.env.MONGOMS_DOWNLOAD_DIR || path.join(__dirname, '..', '.cache', 'mongodb-binaries');
  const mongo = await MongoMemoryServer.create({ binary: { downloadDir } });
  const result = spawnSync(process.execPath, ['--test', 'test/api.test.js'], {
    stdio: 'inherit',
    env: { ...process.env, MONGODB_URI: mongo.getUri(), MONGODB_DB: 'roomfit-test' },
  });
  await mongo.stop();
  process.exit(result.status ?? 1);
})();
