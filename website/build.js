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

// App identity for Universal Links / App Links (/.well-known files, generated
// below). ONE place to update when these change — the bundle/package IDs are
// expected to move to an app.getkozy.* identity once the new Apple Developer
// account lands; set the env vars in Vercel (or edit the fallbacks) + redeploy.
// The Android SHA-256 is the RELEASE keystore fingerprint (credentials/android).
const APPLE_TEAM_ID = process.env.APPLE_TEAM_ID || 'TEAMID_TBD';
const IOS_BUNDLE_ID = process.env.IOS_BUNDLE_ID || 'app.getkozy.kozy';
const ANDROID_PACKAGE = process.env.ANDROID_PACKAGE || 'app.getkozy.kozy';
const ANDROID_CERT_SHA256 =
  process.env.ANDROID_CERT_SHA256 ||
  'E4:93:A1:7C:35:6E:BE:98:76:89:23:13:E1:45:93:2C:F3:6B:FF:EC:A5:55:9A:E0:EB:C8:DE:01:ED:0C:0F:12';
// Dev-machine debug keystore — lets emulator/debug builds pass App Links
// verification during development. Machine-specific key, low risk, but REMOVE
// before store launch (set ANDROID_DEBUG_CERT_SHA256="" in Vercel).
const ANDROID_DEBUG_CERT_SHA256 =
  process.env.ANDROID_DEBUG_CERT_SHA256 ??
  'FA:C6:17:45:DC:09:03:78:6F:B9:ED:E6:2A:96:2B:39:9F:73:48:F0:BB:6F:89:9B:83:32:66:75:91:03:3B:9C';

// Firebase client config injected into the HTML pages (auth-action, listing) —
// public values (the same config ships inside the app binary; security is the
// project's Auth + Firestore rules), env-driven so a future staging project is
// a Vercel env change, not a code release.
const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'kozy-prod-6fbdc';
const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY || 'AIzaSyCURITl0dXqtS1MMpHQwnwNcbJ1b-HxN8M';
const FIREBASE_AUTH_DOMAIN = process.env.FIREBASE_AUTH_DOMAIN || `${FIREBASE_PROJECT_ID}.firebaseapp.com`;

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
      .replaceAll('__PLAY_STORE_URL__', PLAY_STORE_URL)
      .replaceAll('__FIREBASE_PROJECT_ID__', FIREBASE_PROJECT_ID)
      .replaceAll('__FIREBASE_API_KEY__', FIREBASE_API_KEY)
      .replaceAll('__FIREBASE_AUTH_DOMAIN__', FIREBASE_AUTH_DOMAIN);
    if (bothLive) html = html.replaceAll('<span class="soon">Coming soon</span>', '');
    fs.writeFileSync(dst, html);
  } else {
    fs.copyFileSync(src, dst);
  }
}

copy('.', OUT);

// /.well-known — served with Content-Type: application/json via vercel.json headers.
const wellKnown = path.join(OUT, '.well-known');
fs.mkdirSync(wellKnown, { recursive: true });
fs.writeFileSync(
  path.join(wellKnown, 'apple-app-site-association'),
  JSON.stringify({
    applinks: {
      apps: [],
      details: [{ appID: `${APPLE_TEAM_ID}.${IOS_BUNDLE_ID}`, paths: ['/listing/*'] }],
    },
  }, null, 2)
);
fs.writeFileSync(
  path.join(wellKnown, 'assetlinks.json'),
  JSON.stringify([{
    relation: ['delegate_permission/common.handle_all_urls'],
    target: {
      namespace: 'android_app',
      package_name: ANDROID_PACKAGE,
      // ANDROID_CERT_SHA256 accepts a comma-separated list — Play App Signing
      // means the store build is signed by GOOGLE's key, so after the first Play
      // upload this needs BOTH: the Play "App signing key certificate" SHA-256
      // (Play Console → Test and release → App integrity) and, if direct APK
      // installs should keep working, the local release keystore's.
      sha256_cert_fingerprints: [
        ...ANDROID_CERT_SHA256.split(',').map((s) => s.trim()),
        ANDROID_DEBUG_CERT_SHA256,
      ].filter(Boolean),
    },
  }], null, 2)
);

console.log(`built -> ${OUT} (App Store: ${APP_STORE_URL}, Play: ${PLAY_STORE_URL})`);
console.log(`well-known -> appID ${APPLE_TEAM_ID}.${IOS_BUNDLE_ID}, android ${ANDROID_PACKAGE}`);
