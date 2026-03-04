import { useState, useEffect } from 'react';

import { LOGO_URL } from '@/lib/constants';

export function SplashScreen({ onFinish }: { onFinish: () => void }) {
  const [phase, setPhase] = useState<'enter' | 'hold' | 'exit'>('enter');

  useEffect(() => {
    const enterTimer = setTimeout(() => setPhase('hold'), 600);
    const exitTimer = setTimeout(() => setPhase('exit'), 2000);
    const finishTimer = setTimeout(() => onFinish(), 2600);

    return () => {
      clearTimeout(enterTimer);
      clearTimeout(exitTimer);
      clearTimeout(finishTimer);
    };
  }, [onFinish]);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black transition-opacity duration-500 ${
        phase === 'exit' ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <div
        className={`flex flex-col items-center gap-6 transition-all duration-700 ease-out ${
          phase === 'enter'
            ? 'scale-90 opacity-0 translate-y-4'
            : 'scale-100 opacity-100 translate-y-0'
        }`}
      >
        <img
          src={LOGO_URL}
          alt="Solo V3"
          className="w-[250px] object-contain animate-[neon-pulse_2s_ease-in-out_infinite]"
          style={{
            filter: 'drop-shadow(0 0 12px hsl(142, 70%, 45%)) drop-shadow(0 0 30px hsl(142, 70%, 35%))',
          }}
        />
        <h2 className="text-2xl font-bold tracking-tight text-white">
          <span className="text-primary">Solo</span>{' '}
          <span style={{ color: 'hsl(142, 70%, 45%)' }}>V3</span>
        </h2>
        <span className="text-sm text-white/60">
          Planejamento Agrícola Inteligente
        </span>
        <div className="mt-4 w-10 h-1 rounded-full bg-white/20 overflow-hidden">
          <div className="h-full bg-primary rounded-full animate-[splash-bar_1.8s_ease-in-out_forwards]" />
        </div>
      </div>
    </div>
  );
}
