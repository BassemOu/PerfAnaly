// scripts/export-pdf.mjs
// Generates PerfAnaly-Slides.pdf from the 9-slide LuminAI deck
// Usage: node scripts/export-pdf.mjs
// Requires: npm run dev running at http://localhost:3000

import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT = path.join(__dirname, '..', 'public', 'PerfAnaly-Slides.pdf');
const URL = 'http://localhost:3000/slides.html';
const TOTAL_SLIDES = 9;

(async () => {
  console.log('🚀 Launching headless browser…');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();

  // 16:9 viewport matching slide design
  await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 2 });

  console.log(`📄 Loading ${URL} …`);
  await page.goto(URL, { waitUntil: 'networkidle0', timeout: 30000 });

  console.log('🎨 Preparing all slides for print…');
  await page.evaluate((total) => {
    // Show ALL slides (override the single-active display logic)
    document.querySelectorAll('.slide').forEach((s, i) => {
      s.style.display = 'flex';
      s.style.flexDirection = 'column';
      s.style.minHeight = '720px';
      s.style.width = '1280px';
      s.style.maxWidth = '1280px';
      s.style.borderRadius = '0';
      s.style.boxShadow = 'none';
      s.style.pageBreakAfter = i < total - 1 ? 'always' : 'avoid';
      s.style.breakAfter = i < total - 1 ? 'page' : 'avoid';
      s.style.marginBottom = '0';
    });

    // Hide navigation
    const nav = document.querySelector('.nav');
    if (nav) nav.style.display = 'none';

    // Clean up body/deck styles
    document.body.style.background = 'white';
    document.body.style.padding = '0';
    document.body.style.margin = '0';
    document.body.style.minHeight = 'unset';
    document.body.style.display = 'block';

    const deck = document.querySelector('.deck');
    if (deck) {
      deck.style.maxWidth = '1280px';
      deck.style.width = '1280px';
    }
  }, TOTAL_SLIDES);

  // Small delay for any CSS transitions to settle
  await new Promise(r => setTimeout(r, 500));

  console.log(`💾 Generating PDF → ${OUTPUT}`);
  await page.pdf({
    path: OUTPUT,
    width: '1280px',
    height: '720px',
    printBackground: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
  });

  await browser.close();
  console.log(`✅ Done! PDF saved to: public/PerfAnaly-Slides.pdf`);
  console.log(`🌐 Also accessible at: http://localhost:3000/PerfAnaly-Slides.pdf`);
})().catch(err => {
  console.error('❌ Export failed:', err.message);
  process.exit(1);
});
