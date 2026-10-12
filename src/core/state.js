export function createStore(initial = {}) {
  let state = structuredClone(initial);
  const listeners = new Set();

  return {
    set(patch) {
      state = { ...state, ...patch };
      listeners.forEach((fn) => fn(state));
    },
  };
}
