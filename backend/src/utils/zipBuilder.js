const fs = require('node:fs');
const path = require('node:path');

// CRC32 Table for standard ZIP archive creation without external dependencies
const CRC_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  }
  CRC_TABLE[i] = c >>> 0;
}

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

/**
 * Creates a standard uncompressed (STORE) ZIP buffer from an array of { name, data: Buffer }
 */
function createZipBuffer(files) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const file of files) {
    const nameBuf = Buffer.from(file.name.replace(/\\/g, '/'), 'utf8');
    const dataBuf = Buffer.isBuffer(file.data) ? file.data : Buffer.from(file.data);
    const crc = crc32(dataBuf);
    const size = dataBuf.length;

    // Local file header (30 bytes + name)
    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0); // signature
    localHeader.writeUInt16LE(20, 4);         // version needed
    localHeader.writeUInt16LE(0, 6);          // flags
    localHeader.writeUInt16LE(0, 8);          // compression: 0 = STORE
    localHeader.writeUInt16LE(0, 10);         // mod time
    localHeader.writeUInt16LE(0x21, 12);      // mod date
    localHeader.writeUInt32LE(crc, 14);       // crc32
    localHeader.writeUInt32LE(size, 18);      // compressed size
    localHeader.writeUInt32LE(size, 22);      // uncompressed size
    localHeader.writeUInt16LE(nameBuf.length, 26); // filename length
    localHeader.writeUInt16LE(0, 28);         // extra field length

    localParts.push(localHeader, nameBuf, dataBuf);

    // Central directory header (46 bytes + name)
    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0); // signature
    centralHeader.writeUInt16LE(20, 4);         // version made by
    centralHeader.writeUInt16LE(20, 6);         // version needed
    centralHeader.writeUInt16LE(0, 8);          // flags
    centralHeader.writeUInt16LE(0, 10);         // compression: 0 = STORE
    centralHeader.writeUInt16LE(0, 12);         // mod time
    centralHeader.writeUInt16LE(0x21, 14);      // mod date
    centralHeader.writeUInt32LE(crc, 16);       // crc32
    centralHeader.writeUInt32LE(size, 20);      // compressed size
    centralHeader.writeUInt32LE(size, 24);      // uncompressed size
    centralHeader.writeUInt16LE(nameBuf.length, 28); // filename length
    centralHeader.writeUInt16LE(0, 30);         // extra field length
    centralHeader.writeUInt16LE(0, 32);         // file comment length
    centralHeader.writeUInt16LE(0, 34);         // disk number
    centralHeader.writeUInt16LE(0, 36);         // internal attrs
    centralHeader.writeUInt32LE(0, 38);         // external attrs
    centralHeader.writeUInt32LE(offset, 42);    // relative offset

    centralParts.push(centralHeader, nameBuf);
    offset += 30 + nameBuf.length + size;
  }

  const centralDirBuf = Buffer.concat(centralParts);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);             // EOCD signature
  eocd.writeUInt16LE(0, 4);                      // disk number
  eocd.writeUInt16LE(0, 6);                      // start disk
  eocd.writeUInt16LE(files.length, 8);           // entries on disk
  eocd.writeUInt16LE(files.length, 10);          // total entries
  eocd.writeUInt32LE(centralDirBuf.length, 12);  // size of central dir
  eocd.writeUInt32LE(offset, 16);                // offset of central dir
  eocd.writeUInt16LE(0, 20);                     // comment length

  return Buffer.concat([...localParts, centralDirBuf, eocd]);
}

function collectFilesRecursive(dirPath, baseDir = dirPath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const results = [];
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    const fullPath = path.join(dirPath, entry.name);
    const relPath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
    if (entry.isDirectory()) {
      results.push(...collectFilesRecursive(fullPath, baseDir));
    } else if (entry.isFile()) {
      results.push({
        name: relPath,
        data: fs.readFileSync(fullPath)
      });
    }
  }
  return results;
}

/**
 * Build a ZIP package for the browser extension ('chrome' or 'firefox')
 * @param {('chrome'|'firefox')} browserTarget
 * @param {string|null} serverUrl - Optional server origin to inject as default endpoint
 */
function buildExtensionZip(browserTarget = 'chrome', serverUrl = null) {
  const extDir = path.resolve(__dirname, '../../../extension');
  const rawFiles = collectFilesRecursive(extDir);

  const files = rawFiles.map(file => {
    let content = file.data;

    // If serverUrl is provided, customize default connection endpoint in extension
    if (serverUrl && typeof serverUrl === 'string') {
      const isJs = file.name.endsWith('.js');
      const isHtml = file.name.endsWith('.html');
      if (isJs || isHtml) {
        let str = content.toString('utf8');
        str = str.replace(/http:\/\/localhost:3000/g, serverUrl);
        content = Buffer.from(str, 'utf8');
      }
    }

    if (file.name === 'manifest.json') {
      const manifest = JSON.parse(content.toString('utf8'));
      if (serverUrl && typeof serverUrl === 'string') {
        const pattern = `${serverUrl.replace(/\/+$/, '')}/*`;
        if (manifest.host_permissions && !manifest.host_permissions.includes(pattern)) {
          manifest.host_permissions.push(pattern);
        }
      }
      if (browserTarget === 'firefox') {
        // Add Firefox Gecko compatibility settings and background.scripts fallback
        manifest.background = {
          scripts: ['background/service-worker.js'],
          service_worker: 'background/service-worker.js'
        };
        manifest.browser_specific_settings = {
          gecko: {
            id: 'scratch-ai@scratch-community.org',
            strict_min_version: '109.0'
          }
        };
      }
      return {
        name: 'manifest.json',
        data: Buffer.from(JSON.stringify(manifest, null, 2), 'utf8')
      };
    }

    return {
      name: file.name,
      data: content
    };
  });

  return createZipBuffer(files);
}

module.exports = {
  buildExtensionZip
};
