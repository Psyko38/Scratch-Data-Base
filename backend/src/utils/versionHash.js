const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const extDir = path.resolve(__dirname, '../../../extension');

/**
 * Computes a deterministic SHA256 hash of all code and asset files in the extension/ directory.
 * version.json is intentionally excluded so it can store the computed hash.
 */
function computeExtensionHash() {
  try {
    if (!fs.existsSync(extDir)) return 'dev-unknown';

    const hash = crypto.createHash('sha256');

    function walk(dir) {
      const entries = fs.readdirSync(dir, { withFileTypes: true })
        .sort((a, b) => a.name.localeCompare(b.name));

      for (const entry of entries) {
        if (entry.name.startsWith('.') || entry.name === 'version.json') continue;
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          walk(fullPath);
        } else if (entry.isFile()) {
          const relPath = path.relative(extDir, fullPath).replace(/\\/g, '/');
          hash.update(relPath);
          hash.update(fs.readFileSync(fullPath));
        }
      }
    }

    walk(extDir);
    return hash.digest('hex').substring(0, 16);
  } catch (err) {
    console.error('[VersionHash] Error computing extension hash:', err);
    return 'dev-unknown';
  }
}

let cachedHash = computeExtensionHash();

function getExtensionHash(forceRefresh = false) {
  if (forceRefresh || !cachedHash || cachedHash === 'dev-unknown') {
    cachedHash = computeExtensionHash();
  }
  return cachedHash;
}

/**
 * Synchronize extension/version.json on disk with the current hash
 */
function syncVersionFile() {
  try {
    const currentHash = getExtensionHash(true);
    const versionFile = path.join(extDir, 'version.json');
    const manifestPath = path.join(extDir, 'manifest.json');
    let semver = '1.0.0';

    if (fs.existsSync(manifestPath)) {
      const m = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      semver = m.version || '1.0.0';
    }

    const versionData = {
      version: semver,
      hash: currentHash,
      generatedAt: new Date().toISOString()
    };

    fs.writeFileSync(versionFile, JSON.stringify(versionData, null, 2) + '\n', 'utf8');
    return versionData;
  } catch (err) {
    console.error('[VersionHash] Failed to sync version.json:', err);
    return null;
  }
}

module.exports = {
  computeExtensionHash,
  getExtensionHash,
  syncVersionFile
};
