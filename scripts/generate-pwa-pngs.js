import fs from 'fs';
import zlib from 'zlib';
import path from 'path';

function createCRC32Table() {
  const cTable = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) c = 0xedb88320 ^ (c >>> 1);
      else c = c >>> 1;
    }
    cTable[n] = c;
  }
  return cTable;
}

const crcTable = createCRC32Table();

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function writeChunk(type, data) {
  const len = data.length;
  const buf = Buffer.alloc(8 + len + 4);
  buf.writeUInt32BE(len, 0);
  buf.write(type, 4, 4, 'ascii');
  data.copy(buf, 8);
  const crcBuf = buf.subarray(4, 8 + len);
  const crcVal = crc32(crcBuf);
  buf.writeUInt32BE(crcVal, 8 + len);
  return buf;
}

function generatePNG(size, filename) {
  const width = size;
  const height = size;

  // Raw image RGBA buffer + 1 filter byte per scanline
  const rawScanlines = Buffer.alloc(height * (1 + width * 4));

  let offset = 0;
  for (let y = 0; y < height; y++) {
    rawScanlines[offset++] = 0; // Filter type 0 (None)
    for (let x = 0; x < width; x++) {
      // Background dark #000000
      let r = 0, g = 0, b = 0, a = 255;

      // Rounded rectangle border emerald #10b981
      const pad = Math.floor(size * 0.08);
      const isInsideCard = x >= pad && x <= width - pad && y >= pad && y <= height - pad;

      // Distance from center for logo circle
      const cx = width / 2;
      const cy = height / 2;
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      const radius = size * 0.32;

      if (dist <= radius) {
        // Emerald background circle #10b981
        r = 0x10;
        g = 0xb9;
        b = 0x81;

        // Shopping bag handle & body inside
        const bx = Math.abs(x - cx);
        const by = Math.abs(y - cy);
        if (bx <= size * 0.14 && by <= size * 0.14 && (bx >= size * 0.1 || by >= size * 0.1)) {
          r = 0x00;
          g = 0x00;
          b = 0x00;
        }
      } else if (isInsideCard && (x < pad + 8 || x > width - pad - 8 || y < pad + 8 || y > height - pad - 8)) {
        // Emerald border #10b981
        r = 0x34;
        g = 0xd3;
        b = 0x99;
      }

      rawScanlines[offset++] = r;
      rawScanlines[offset++] = g;
      rawScanlines[offset++] = b;
      rawScanlines[offset++] = a;
    }
  }

  const compressedIDAT = zlib.deflateSync(rawScanlines);

  // PNG Header
  const header = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR Chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // 8 bit depth
  ihdrData[9] = 6; // Color type 6 (RGBA)
  ihdrData[10] = 0; // Compression
  ihdrData[11] = 0; // Filter
  ihdrData[12] = 0; // Interlace
  const ihdrChunk = writeChunk('IHDR', ihdrData);

  // IDAT Chunk
  const idatChunk = writeChunk('IDAT', compressedIDAT);

  // IEND Chunk
  const iendChunk = writeChunk('IEND', Buffer.alloc(0));

  const pngBuffer = Buffer.concat([header, ihdrChunk, idatChunk, iendChunk]);
  fs.writeFileSync(filename, pngBuffer);
  console.log(`Wygenerowano PWA ikone PNG: ${filename} (${pngBuffer.length} bajtów)`);
}

const publicDir = path.resolve(process.cwd(), 'public');
generatePNG(192, path.join(publicDir, 'icon-192.png'));
generatePNG(512, path.join(publicDir, 'icon-512.png'));
generatePNG(192, path.join(publicDir, 'apple-touch-icon.png'));
