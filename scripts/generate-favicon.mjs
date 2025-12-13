import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');

// Create a simple green square with "B" as PNG (since SVG text rendering is complex)
async function generateFavicons() {
  // Create a 32x32 green favicon with rounded corners
  const size = 32;
  const svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#22c55e"/>
        <stop offset="100%" style="stop-color:#16a34a"/>
      </linearGradient>
    </defs>
    <rect width="${size}" height="${size}" rx="6" fill="url(#grad)"/>
    <text x="16" y="23" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="white" text-anchor="middle">B</text>
  </svg>`;

  // Generate 32x32 PNG
  await sharp(Buffer.from(svg))
    .png()
    .toFile(join(publicDir, 'favicon-32x32.png'));
  console.log('Created favicon-32x32.png');

  // Generate 16x16 PNG
  const svg16 = `<svg width="16" height="16" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#22c55e"/>
        <stop offset="100%" style="stop-color:#16a34a"/>
      </linearGradient>
    </defs>
    <rect width="16" height="16" rx="3" fill="url(#grad)"/>
    <text x="8" y="12" font-family="Arial, sans-serif" font-size="10" font-weight="bold" fill="white" text-anchor="middle">B</text>
  </svg>`;

  await sharp(Buffer.from(svg16))
    .png()
    .toFile(join(publicDir, 'favicon-16x16.png'));
  console.log('Created favicon-16x16.png');

  // Generate ICO (using 32x32 PNG as base)
  const png32 = await sharp(Buffer.from(svg))
    .png()
    .toBuffer();

  // Simple ICO file format (single 32x32 image)
  // ICO header: 6 bytes
  // ICO directory entry: 16 bytes per image
  // PNG data follows

  const icoHeader = Buffer.alloc(6);
  icoHeader.writeUInt16LE(0, 0); // Reserved
  icoHeader.writeUInt16LE(1, 2); // Type: 1 = ICO
  icoHeader.writeUInt16LE(1, 4); // Number of images

  const icoEntry = Buffer.alloc(16);
  icoEntry.writeUInt8(32, 0);  // Width (0 means 256)
  icoEntry.writeUInt8(32, 1);  // Height
  icoEntry.writeUInt8(0, 2);   // Color palette
  icoEntry.writeUInt8(0, 3);   // Reserved
  icoEntry.writeUInt16LE(1, 4); // Color planes
  icoEntry.writeUInt16LE(32, 6); // Bits per pixel
  icoEntry.writeUInt32LE(png32.length, 8); // Size of image data
  icoEntry.writeUInt32LE(22, 12); // Offset to image data (6 + 16)

  const ico = Buffer.concat([icoHeader, icoEntry, png32]);
  writeFileSync(join(publicDir, 'favicon.ico'), ico);
  console.log('Created favicon.ico');

  console.log('All favicons generated successfully!');
}

generateFavicons().catch(console.error);
