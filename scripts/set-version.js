#!/usr/bin/env node
// Single source of truth for app versioning: app.json — but this script also patches
// the generated native projects (ios/ and android/) directly, so no prebuild is
// needed after a version bump (Joopi-style one-step).
//   node scripts/set-version.js            -> print current version/build
//   node scripts/set-version.js 1.0.1      -> set version, bump build by 1
//   node scripts/set-version.js 1.0.1 12   -> set version and exact build number
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const appJsonPath = path.join(root, 'app.json');
const json = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
const expo = json.expo;

const [version, buildArg] = process.argv.slice(2);

const currentBuild = parseInt(expo.ios?.buildNumber ?? '1', 10);

if (!version) {
  console.log(`version ${expo.version} (iOS build ${expo.ios?.buildNumber ?? '-'}, Android versionCode ${expo.android?.versionCode ?? '-'})`);
  process.exit(0);
}

if (!/^\d+\.\d+\.\d+$/.test(version)) {
  console.error(`Invalid version "${version}" — expected semver like 1.0.1`);
  process.exit(1);
}

const build = buildArg ? parseInt(buildArg, 10) : currentBuild + 1;
if (!Number.isInteger(build) || build < 1) {
  console.error(`Invalid build number "${buildArg}"`);
  process.exit(1);
}

// 1) app.json (source of truth — prebuild regenerates natives from this)
expo.version = version;
expo.ios = { ...expo.ios, buildNumber: String(build) };
expo.android = { ...expo.android, versionCode: build };
fs.writeFileSync(appJsonPath, JSON.stringify(json, null, 2) + '\n');

// 2) ios/kozy/Info.plist (if generated)
const plistPath = path.join(root, 'ios', 'kozy', 'Info.plist');
if (fs.existsSync(plistPath)) {
  let plist = fs.readFileSync(plistPath, 'utf8');
  plist = plist.replace(
    /(<key>CFBundleShortVersionString<\/key>\s*<string>)[^<]*(<\/string>)/,
    `$1${version}$2`
  );
  plist = plist.replace(
    /(<key>CFBundleVersion<\/key>\s*<string>)[^<]*(<\/string>)/,
    `$1${build}$2`
  );
  fs.writeFileSync(plistPath, plist);
}

// 3) android/app/build.gradle (if generated)
const gradlePath = path.join(root, 'android', 'app', 'build.gradle');
if (fs.existsSync(gradlePath)) {
  let gradle = fs.readFileSync(gradlePath, 'utf8');
  gradle = gradle.replace(/versionCode \d+/, `versionCode ${build}`);
  gradle = gradle.replace(/versionName "[^"]*"/, `versionName "${version}"`);
  fs.writeFileSync(gradlePath, gradle);
}

console.log(`Set version ${version} (build ${build}) in app.json, Info.plist, and build.gradle.`);
