import { useCallback, useEffect, useState } from 'react';

import { RESEND_COOLDOWN_SEC } from '@/constants/data';

// Resend cooldown: start() (re)arms the countdown, `seconds` ticks to 0, `active`
// while counting. Used by signUp/verify and forgot-password so email resends
// can't be spammed (and Firebase's too-many-requests is never hit in normal use).
export default function useCooldown(durationSec = RESEND_COOLDOWN_SEC) {
  const [seconds, setSeconds] = useState(0);

  const start = useCallback(() => setSeconds(durationSec), [durationSec]);

  useEffect(() => {
    if (seconds <= 0) return undefined;
    const id = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [seconds]);

  return { seconds, active: seconds > 0, start };
}

export function formatCooldown(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
