import { useRef, useEffect } from 'react';

// Appui long : tap = 1 coup, maintien = répétition (80ms après 400ms).
// Renvoie pressProps(key, fn) à étaler sur l'élément ; timers nettoyés au démontage.
export function usePressRepeat() {
  const timers = useRef({});
  useEffect(() => () => {
    Object.values(timers.current).forEach(id => { clearTimeout(id); clearInterval(id); });
  }, []);
  return function pressProps(key, fn) {
    const start = () => {
      fn();
      timers.current[key + 't'] = setTimeout(() => {
        timers.current[key + 'i'] = setInterval(fn, 80);
      }, 400);
    };
    const stop = () => {
      clearTimeout(timers.current[key + 't']);
      clearInterval(timers.current[key + 'i']);
    };
    return { onPointerDown: e => { e.preventDefault(); start(); }, onPointerUp: stop, onPointerLeave: stop, onPointerCancel: stop };
  };
}
