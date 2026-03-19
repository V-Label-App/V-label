let audioCtx: AudioContext | null = null;
let audioUnlocked = false;

const getOrCreateContext = (): AudioContext | null => {
  try {
    if (!audioCtx || audioCtx.state === 'closed') {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return null;
      audioCtx = new AudioContextClass();
      console.log('[Audio] AudioContext created, state:', audioCtx.state);
    }
    return audioCtx;
  } catch (e) {
    console.error('[Audio] Failed to create AudioContext:', e);
    return null;
  }
};

const playTones = (ctx: AudioContext) => {
  const t = ctx.currentTime;
  const pairs: [number, number, number, number][] = [
    [1046.50, 0.5, 0.08, 0],
    [1318.51, 0.6, 0.1, 0.12],
  ];
  for (const [freq, duration, vol, delay] of pairs) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, t + delay);
    gain.gain.linearRampToValueAtTime(vol, t + delay + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, t + delay + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t + delay);
    osc.stop(t + delay + duration);
  }
  console.log('[Audio] Tones scheduled, context state:', ctx.state);
};

// Unlock AudioContext on first user interaction (required by browsers)
if (typeof window !== 'undefined') {
  const unlock = () => {
    const ctx = getOrCreateContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().then(() => {
        audioUnlocked = true;
        console.log('[Audio] AudioContext unlocked, state:', ctx.state);
      });
    } else if (ctx) {
      audioUnlocked = true;
      console.log('[Audio] AudioContext ready on unlock, state:', ctx.state);
    }
    document.removeEventListener('click', unlock);
    document.removeEventListener('keydown', unlock);
    document.removeEventListener('touchstart', unlock);
  };
  document.addEventListener('click', unlock);
  document.addEventListener('keydown', unlock);
  document.addEventListener('touchstart', unlock);
}

export const playNotificationSound = async () => {
  console.log('[Audio] playNotificationSound called, unlocked:', audioUnlocked);
  try {
    const ctx = getOrCreateContext();
    if (!ctx) {
      console.warn('[Audio] No AudioContext available');
      return;
    }

    console.log('[Audio] Context state before play:', ctx.state);

    if (ctx.state === 'suspended') {
      try {
        await ctx.resume();
        console.log('[Audio] Resumed, state now:', ctx.state);
      } catch (e) {
        console.warn('[Audio] resume() failed:', e);
        return;
      }
    }

    if (ctx.state !== 'running') {
      console.warn('[Audio] Context not running, state:', ctx.state);
      return;
    }

    playTones(ctx);
  } catch (e) {
    console.error('[Audio] playNotificationSound error:', e);
  }
};
