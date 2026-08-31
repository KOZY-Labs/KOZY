// Applies our vendored native-source patches into node_modules after install.
// Runs from the package.json "postinstall" hook — no patch-package dependency.
//
// Current patch:
//   react-native-maps 1.29.0 — iOS Fabric renders custom <Marker> children as a
//   0x0 icon view (invisible price pills). Community fix from
//   https://github.com/react-native-maps/react-native-maps/issues/5971 applied
//   as a full-file replacement of AIRGoogleMapMarker.m.
//
// The patch is version-pinned: if react-native-maps is ever upgraded, this
// script refuses to overwrite and exits with an error so the mismatch is
// resolved deliberately (drop the patch if upstream fixed #5971).
const fs = require('fs');
const path = require('path');

const PATCHES = [
  {
    package: 'react-native-maps',
    version: '1.29.0',
    source: path.join(__dirname, '..', 'patches', 'react-native-maps+1.29.0+AIRGoogleMapMarker.m'),
    target: path.join(
      __dirname, '..', 'node_modules', 'react-native-maps', 'ios', 'AirGoogleMaps', 'AIRGoogleMapMarker.m'
    ),
  },
];

let failed = false;

for (const patch of PATCHES) {
  const pkgJsonPath = path.join(__dirname, '..', 'node_modules', patch.package, 'package.json');
  if (!fs.existsSync(pkgJsonPath)) {
    console.warn(`[patches] ${patch.package} not installed — skipping`);
    continue;
  }
  const installed = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8')).version;
  if (installed !== patch.version) {
    console.error(
      `[patches] ${patch.package}@${installed} != patched version ${patch.version}.\n` +
      `  Re-check whether the patch is still needed (see ${patch.source}) and update or remove it.`
    );
    failed = true;
    continue;
  }
  fs.copyFileSync(patch.source, patch.target);
  console.log(`[patches] applied ${path.basename(patch.source)} -> ${patch.package}@${installed}`);
}

process.exit(failed ? 1 : 0);
