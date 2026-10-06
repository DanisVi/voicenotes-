export function isSpeechSupported() {
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

export function createRecognizer({
  lang = 'ru-RU',
  onResult,
  onError,
  onEnd,
} = {}) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    return {
      isSupported: false,
      start() { onError && onError(new Error('speech-not-supported')); },
      stop() {},
      abort() {},
    };
  }
  const rec = new SR();
  rec.lang = lang;
  rec.continuous = true;
  rec.interimResults = true;
  rec.maxAlternatives = 1;

  let finalText = '';

  rec.onresult = (e) => {
    const last = e.results[e.results.length - 1];
    if (!last) return;
    const t = (last[0].transcript || '').trim();
    if (last.isFinal) onResult && onResult({ final: t, interim: '' });
    else onResult && onResult({ final: '', interim: t });
  };

  rec.onerror = (e) => onError && onError(e);
  rec.onend = () => onEnd && onEnd(finalText);

  return {
    isSupported: true,
    start() {
      finalText = '';
      try { rec.start(); } catch (_) {}
    },
    stop() { try { rec.stop(); } catch (_) {} },
    abort() { try { rec.abort(); } catch (_) {} },
  };
}
