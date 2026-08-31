// Build step for the static site: copies everything into public/ and injects the
// app-store links from Vercel env vars, so updating a link is just changing the
// env var (APP_STORE_URL / PLAY_STORE_URL) and redeploying — no code edit.
// When BOTH links are set, the "Coming soon" badge is dropped automatically.
const fs = require('fs');
const path = require('path');

const OUT = 'public';
const SKIP = new Set([OUT, 'build.js', '.vercel', 'vercel.json', 'node_modules', '.gitignore']);

const APP_STORE_URL = process.env.APP_STORE_URL || '#';
const PLAY_STORE_URL = process.env.PLAY_STORE_URL || '#';
const bothLive = APP_STORE_URL !== '#' && PLAY_STORE_URL !== '#';

fs.rmSync(OUT, { recursive: true, force: true });

function copy(src, dst) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dst, { recursive: true });
    for (const name of fs.readdirSync(src)) {
      if (src === '.' && SKIP.has(name)) continue;
      copy(path.join(src, name), path.join(dst, name));
    }
    return;
  }
  if (src.endsWith('.html')) {
    let html = fs.readFileSync(src, 'utf8')
      .replaceAll('__APP_STORE_URL__', APP_STORE_URL)
      .replaceAll('__PLAY_STORE_URL__', PLAY_STORE_URL);
    if (bothLive) html = html.replaceAll('<span class="soon">Coming soon</span>', '');
    fs.writeFileSync(dst, html);
  } else {
    fs.copyFileSync(src, dst);
  }
}

copy('.', OUT);
console.log(`built -> ${OUT} (App Store: ${APP_STORE_URL}, Play: ${PLAY_STORE_URL})`);
