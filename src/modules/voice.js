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
    let interim = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const res = e.results[i];
      const t = (res[0].transcript || '').trim();
      if (!t) continue;
      if (res.isFinal) finalText = (finalText ? finalText + ' ' : '') + t;
      else interim = (interim ? interim + ' ' : '') + t;
    }
    onResult && onResult({ final: finalText, interim });
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
