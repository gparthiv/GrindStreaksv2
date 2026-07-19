import { Jimp, rgbaToInt } from 'jimp';

const stops = [
  { offset: 0.0, r: 0, g: 255, b: 135, a: 255 },    // Neon Green/Cyan core
  { offset: 0.3, r: 16, g: 185, b: 129, a: 240 },   // Emerald Green mid-core
  { offset: 0.6, r: 52, g: 211, b: 153, a: 180 },   // Mint Green body
  { offset: 0.8, r: 167, g: 243, b: 208, a: 100 },  // Soft Sage border
  { offset: 0.95, r: 209, g: 250, b: 229, a: 20 },  // Whispering Green edge
  { offset: 1.0, r: 255, g: 255, b: 255, a: 0 }     // Fully transparent outer margin
];

function interpolate(val1, val2, factor) {
  return Math.round(val1 + (val2 - val1) * factor);
}

function getColorForRatio(ratio) {
  if (ratio <= 0) return stops[0];
  if (ratio >= 1) return stops[stops.length - 1];

  for (let i = 0; i < stops.length - 1; i++) {
    const s1 = stops[i];
    const s2 = stops[i + 1];
    if (ratio >= s1.offset && ratio <= s2.offset) {
      const segmentRatio = (ratio - s1.offset) / (s2.offset - s1.offset);
      return {
        r: interpolate(s1.r, s2.r, segmentRatio),
        g: interpolate(s1.g, s2.g, segmentRatio),
        b: interpolate(s1.b, s2.b, segmentRatio),
        a: interpolate(s1.a, s2.a, segmentRatio)
      };
    }
  }
  return stops[stops.length - 1];
}

async function generateIcon(size, outputPath) {
  const image = new Jimp({ width: size, height: size });
  const cx = size / 2;
  const cy = size / 2;
  const maxRadius = size / 2;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const ratio = distance / maxRadius;

      const color = getColorForRatio(ratio);
      const intColor = rgbaToInt(color.r, color.g, color.b, color.a);
      image.setPixelColor(intColor, x, y);
    }
  }

  await image.write(outputPath);
  console.log(`Generated: ${outputPath} (${size}x${size})`);
}

async function run() {
  try {
    await generateIcon(192, 'public/icon-192.png');
    await generateIcon(512, 'public/icon-512.png');
    await generateIcon(192, 'src/assets/logo.png');
    console.log('Successfully generated PWA PNG icons and src/assets/logo.png!');
  } catch (error) {
    console.error('Error generating icons:', error);
  }
}

run();
