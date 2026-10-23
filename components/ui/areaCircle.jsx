// The "general location" circle drawn around a listing's approximate point
// (lib/geo/approxLocation.mjs). Shared by the detail map and the search maps so
// every surface tells the same story: "somewhere in here", never an exact spot.
import { Circle } from 'react-native-maps';

import { colors } from '@/constants/colors';
import { APPROX_RADIUS_M } from '@/lib/geo/approxLocation.mjs';

export default function AreaCircle({ center }) {
  return (
    <Circle
      center={center}
      radius={APPROX_RADIUS_M}
      strokeWidth={2}
      strokeColor={colors.base.accent}
      fillColor={`${colors.base.accent}33`}
    />
  );
}
