import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { RESEND_COOLDOWN_SEC } from '@/constants/data';

// Resend cooldown: start() (re)arms the countdown, `seconds` ticks to 0, `active`
// while counting. Used by signUp/verify and forgot-password so email resends
// can't be spammed (and Firebase's too-many-requests is never hit in normal use).
//
// Wall-clock based: the deadline is a timestamp, and `seconds` is derived from
// Date.now(), so time keeps passing while the app is backgrounded (JS timers
// pause there) — coming back after a minute shows 0, not a frozen countdown.
const remaining = (endAt) => (endAt ? Math.max(0, Math.ceil((endAt - Date.now()) / 1000)) : 0);

export default function useCooldown(durationSec = RESEND_COOLDOWN_SEC) {
  const [endAt, setEndAt] = useState(null);
  const [seconds, setSeconds] = useState(0);

  const start = useCallback(() => {
    const end = Date.now() + durationSec * 1000;
    setEndAt(end);
    setSeconds(durationSec);
  }, [durationSec]);

  useEffect(() => {
    if (!endAt) return undefined;
    const tick = () => {
      const left = remaining(endAt);
      setSeconds(left);
      if (left <= 0) setEndAt(null);
    };
    const id = setInterval(tick, 1000);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') tick();
    });
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, [endAt]);

  return { seconds, active: seconds > 0, start };
}

export function formatCooldown(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
