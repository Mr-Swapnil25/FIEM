/**
 * EventEase PWA Icon Generator
 * Run with: node scripts/create-icons.js
 * 
 * This script creates PNG icon files by writing pre-generated Base64 data.
 * No external dependencies required!
 */

const fs = require('fs');
const path = require('path');

const iconsDir = path.join(__dirname, '..', 'public', 'icons');

// Ensure icons directory exists
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

console.log('🎨 EventEase Icon Generator');
console.log('==========================\n');

// Since we can't use canvas in Node without native deps on Windows,
// we'll create a simple colored PNG programmatically using pure JavaScript.

// PNG file structure helper
function createPNG(width, height, colorFunc) {
  // PNG signature
  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  
  // IHDR chunk
  const ihdr = Buffer.alloc(25);
  ihdr.writeUInt32BE(13, 0); // Length
  ihdr.write('IHDR', 4);
  ihdr.writeUInt32BE(width, 8);
  ihdr.writeUInt32BE(height, 12);
  ihdr.writeUInt8(8, 16);  // Bit depth
  ihdr.writeUInt8(2, 17);  // Color type (RGB)
  ihdr.writeUInt8(0, 18);  // Compression
  ihdr.writeUInt8(0, 19);  // Filter
  ihdr.writeUInt8(0, 20);  // Interlace
  
  // Calculate CRC for IHDR
  const ihdrData = ihdr.slice(4, 21);
  const ihdrCrc = crc32(ihdrData);
  ihdr.writeInt32BE(ihdrCrc, 21);
  
  // Create image data
  const rawData = [];
  for (let y = 0; y < height; y++) {
    rawData.push(0); // Filter byte (none)
    for (let x = 0; x < width; x++) {
      const { r, g, b } = colorFunc(x, y, width, height);
      rawData.push(r, g, b);
    }
  }
  
  // Compress with zlib (using simple store method for simplicity)
  const compressed = deflateStore(Buffer.from(rawData));
  
  // IDAT chunk
  const idat = Buffer.alloc(12 + compressed.length);
  idat.writeUInt32BE(compressed.length, 0);
  idat.write('IDAT', 4);
  compressed.copy(idat, 8);
  const idatCrc = crc32(Buffer.concat([Buffer.from('IDAT'), compressed]));
  idat.writeInt32BE(idatCrc, 8 + compressed.length);
  
  // IEND chunk
  const iend = Buffer.from([0, 0, 0, 0, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82]);
  
  return Buffer.concat([signature, ihdr, idat, iend]);
}

// Simple deflate store (no compression, just valid zlib)
function deflateStore(data) {
  const chunks = [];
  let offset = 0;
  const CHUNK_SIZE = 65535;
  
  // Zlib header
  chunks.push(Buffer.from([0x78, 0x01]));
  
  while (offset < data.length) {
    const remaining = data.length - offset;
    const chunkLen = Math.min(CHUNK_SIZE, remaining);
    const isLast = offset + chunkLen >= data.length;
    
    const header = Buffer.alloc(5);
    header.writeUInt8(isLast ? 1 : 0, 0);
    header.writeUInt16LE(chunkLen, 1);
    header.writeUInt16LE(chunkLen ^ 0xFFFF, 3);
    
    chunks.push(header);
    chunks.push(data.slice(offset, offset + chunkLen));
    
    offset += chunkLen;
  }
  
  // Adler-32 checksum
  let a = 1, b = 0;
  for (let i = 0; i < data.length; i++) {
    a = (a + data[i]) % 65521;
    b = (b + a) % 65521;
  }
  const adler = Buffer.alloc(4);
  adler.writeUInt32BE((b << 16) | a, 0);
  chunks.push(adler);
  
  return Buffer.concat(chunks);
}

// CRC32 implementation
function crc32(data) {
  let crc = 0xFFFFFFFF;
  const table = [];
  
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  
  for (let i = 0; i < data.length; i++) {
    crc = table[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
  }
  
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

// Color function for gradient with calendar icon shape
function createIconColorFunc(isMaskable) {
  return (x, y, width, height) => {
    // Gradient from top-left to bottom-right
    const t = (x + y) / (width + height);
    const r1 = 0x13, g1 = 0x5b, b1 = 0xec; // #135bec
    const r2 = 0x0f, g2 = 0x4b, b2 = 0xc4; // #0f4bc4
    
    let r = Math.round(r1 + (r2 - r1) * t);
    let g = Math.round(g1 + (g2 - g1) * t);
    let b = Math.round(b1 + (b2 - b1) * t);
    
    // Normalize coordinates
    const nx = x / width;
    const ny = y / height;
    
    // Safe zone for maskable
    const safeZone = isMaskable ? 0.15 : 0;
    const iconArea = 1 - safeZone * 2;
    
    // Check if we're in the icon drawing area
    const inSafeZone = nx >= safeZone && nx <= 1 - safeZone && 
                       ny >= safeZone && ny <= 1 - safeZone;
    
    if (inSafeZone || !isMaskable) {
      // Adjust coordinates for safe zone
      const ax = isMaskable ? (nx - safeZone) / iconArea : nx;
      const ay = isMaskable ? (ny - safeZone) / iconArea : ny;
      
      // Calendar body (centered rectangle outline)
      const bodyLeft = 0.19;
      const bodyRight = 0.81;
      const bodyTop = 0.27;
      const bodyBottom = 0.75;
      const borderWidth = 0.035;
      
      // Check if in calendar body border
      const inBodyHorizontalBorder = ax >= bodyLeft && ax <= bodyRight &&
        ((ay >= bodyTop && ay <= bodyTop + borderWidth) ||
         (ay >= bodyBottom - borderWidth && ay <= bodyBottom));
      
      const inBodyVerticalBorder = ay >= bodyTop && ay <= bodyBottom &&
        ((ax >= bodyLeft && ax <= bodyLeft + borderWidth) ||
         (ax >= bodyRight - borderWidth && ax <= bodyRight));
      
      // Header line
      const headerY = 0.40;
      const inHeaderLine = ax >= bodyLeft && ax <= bodyRight &&
        ay >= headerY - borderWidth/2 && ay <= headerY + borderWidth/2;
      
      // Calendar hooks
      const hook1X = 0.33;
      const hook2X = 0.67;
      const hookTop = 0.19;
      const hookBottom = 0.33;
      const hookWidth = 0.035;
      
      const inHook1 = ax >= hook1X - hookWidth/2 && ax <= hook1X + hookWidth/2 &&
        ay >= hookTop && ay <= hookBottom;
      const inHook2 = ax >= hook2X - hookWidth/2 && ax <= hook2X + hookWidth/2 &&
        ay >= hookTop && ay <= hookBottom;
      
      // Date dots (simplified grid)
      const dotSize = 0.09;
      const dotGap = 0.17;
      const dotStartX = 0.28;
      const dotStartY = 0.48;
      
      let inDot = false;
      for (let row = 0; row < 2; row++) {
        for (let col = 0; col < 3; col++) {
          if (row === 1 && col === 2) continue; // Skip last dot
          const dotCenterX = dotStartX + col * dotGap;
          const dotCenterY = dotStartY + row * 0.15;
          if (ax >= dotCenterX && ax <= dotCenterX + dotSize &&
              ay >= dotCenterY && ay <= dotCenterY + dotSize) {
            inDot = true;
          }
        }
      }
      
      // Make white if in any calendar element
      if (inBodyHorizontalBorder || inBodyVerticalBorder || inHeaderLine ||
          inHook1 || inHook2 || inDot) {
        r = 255;
        g = 255;
        b = 255;
      }
    }
    
    // Round corners for non-maskable
    if (!isMaskable) {
      const cornerRadius = 0.15;
      const corners = [
        { cx: cornerRadius, cy: cornerRadius },
        { cx: 1 - cornerRadius, cy: cornerRadius },
        { cx: cornerRadius, cy: 1 - cornerRadius },
        { cx: 1 - cornerRadius, cy: 1 - cornerRadius }
      ];
      
      for (const corner of corners) {
        const inCornerZone = (nx < cornerRadius && ny < cornerRadius) ||
                            (nx > 1 - cornerRadius && ny < cornerRadius) ||
                            (nx < cornerRadius && ny > 1 - cornerRadius) ||
                            (nx > 1 - cornerRadius && ny > 1 - cornerRadius);
        
        if (inCornerZone) {
          const dx = Math.abs(nx - corner.cx);
          const dy = Math.abs(ny - corner.cy);
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          if (dist > cornerRadius) {
            // Outside rounded corner - make transparent (use dark bg color)
            r = 11; // #0B1019
            g = 16;
            b = 25;
          }
        }
      }
    }
    
    return { r, g, b };
  };
}

// Generate icons
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

console.log('Generating standard icons...\n');

for (const size of sizes) {
  const filename = `icon-${size}x${size}.png`;
  const filepath = path.join(iconsDir, filename);
  
  try {
    const png = createPNG(size, size, createIconColorFunc(false));
    fs.writeFileSync(filepath, png);
    console.log(`  ✅ Created ${filename}`);
  } catch (err) {
    console.log(`  ❌ Failed ${filename}: ${err.message}`);
  }
}

console.log('\nGenerating maskable icon...\n');

try {
  const filename = 'icon-maskable-512x512.png';
  const filepath = path.join(iconsDir, filename);
  const png = createPNG(512, 512, createIconColorFunc(true));
  fs.writeFileSync(filepath, png);
  console.log(`  ✅ Created ${filename}`);
} catch (err) {
  console.log(`  ❌ Failed maskable icon: ${err.message}`);
}

console.log('\n==========================');
console.log('✨ Icon generation complete!');
console.log(`📁 Icons saved to: ${iconsDir}`);
console.log('\nNext steps:');
console.log('  1. Run: npm run build');
console.log('  2. Run: npm run preview');
console.log('  3. Test in Chrome DevTools > Application > Manifest');
