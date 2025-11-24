#!/usr/bin/env node

/**
 * Generate PRAYLOCK background image with gradient and logo
 * This script creates a high-quality background image for the Family Controls shield
 */

const fs = require('fs');
const { createCanvas } = require('canvas');

// Shield dimensions (iPhone screen size)
const WIDTH = 375;
const HEIGHT = 812;

function createGradientBackground() {
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');

  // Create the exact gradient from OnboardingGradientBackground
  // Colors: #141941 → #3b2f7f → #b44da6
  const gradient = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  gradient.addColorStop(0, '#141941'); // Dark navy
  gradient.addColorStop(0.5, '#3b2f7f'); // Purple
  gradient.addColorStop(1, '#b44da6'); // Pink/magenta

  // Fill background
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Add subtle overlay for depth (matching welcome screen)
  const overlay = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  overlay.addColorStop(0, 'rgba(139, 69, 19, 0.1)');
  overlay.addColorStop(0.5, 'transparent');
  overlay.addColorStop(1, 'rgba(30, 144, 255, 0.1)');
  
  ctx.fillStyle = overlay;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Add logo text: "justpray🙏"
  const centerX = WIDTH / 2;
  const logoY = HEIGHT * 0.35; // Position logo in upper third

  // Set font properties (approximating Inter font)
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // "just" part - lighter weight, white
  ctx.font = '32px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillStyle = '#FFFFFF';
  ctx.letterSpacing = '-1.5px';
  
  // Measure text to position properly
  const justText = 'just';
  const justWidth = ctx.measureText(justText).width;
  
  const prayText = 'pray';
  ctx.font = 'bold 32px -apple-system, BlinkMacSystemFont, sans-serif';
  const prayWidth = ctx.measureText(prayText).width;
  
  const emoji = '🙏';
  ctx.font = '28px -apple-system, BlinkMacSystemFont, sans-serif';
  const emojiWidth = ctx.measureText(emoji).width;
  
  const totalWidth = justWidth + prayWidth + emojiWidth + 8; // 8px spacing
  const startX = centerX - totalWidth / 2;
  
  // Draw "just" (white, normal weight)
  ctx.font = '32px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(justText, startX + justWidth / 2, logoY);
  
  // Draw "pray" (accent blue, bold)
  ctx.font = 'bold 32px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillStyle = '#7DD3FC'; // Accent blue from welcome screen
  ctx.fillText(prayText, startX + justWidth + prayWidth / 2 + 4, logoY);
  
  // Draw emoji
  ctx.font = '28px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText(emoji, startX + justWidth + prayWidth + emojiWidth / 2 + 8, logoY);

  // Add subtle text shadow for depth
  ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 1;
  ctx.shadowBlur = 2;

  return canvas;
}

function main() {
  console.log('Generating PRAYLOCK background image...');
  
  const canvas = createGradientBackground();
  
  // Save as PNG
  const outputPath = 'assets/images/praylock-background.png';
  const buffer = canvas.toBuffer('image/png');
  
  fs.writeFileSync(outputPath, buffer);
  console.log(`✅ Background image saved to: ${outputPath}`);
  
  // Also create @2x and @3x versions for different screen densities
  const canvas2x = createCanvas(WIDTH * 2, HEIGHT * 2);
  const ctx2x = canvas2x.getContext('2d');
  ctx2x.scale(2, 2);
  ctx2x.drawImage(canvas, 0, 0);
  
  const outputPath2x = 'assets/images/praylock-background@2x.png';
  fs.writeFileSync(outputPath2x, canvas2x.toBuffer('image/png'));
  console.log(`✅ 2x background image saved to: ${outputPath2x}`);
  
  const canvas3x = createCanvas(WIDTH * 3, HEIGHT * 3);
  const ctx3x = canvas3x.getContext('2d');
  ctx3x.scale(3, 3);
  ctx3x.drawImage(canvas, 0, 0);
  
  const outputPath3x = 'assets/images/praylock-background@3x.png';
  fs.writeFileSync(outputPath3x, canvas3x.toBuffer('image/png'));
  console.log(`✅ 3x background image saved to: ${outputPath3x}`);
}

if (require.main === module) {
  main();
}

module.exports = { createGradientBackground };
