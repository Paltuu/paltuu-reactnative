type Listener = () => void;
const listeners = new Set<Listener>();

/** Fired when the Home tab icon is pressed while already on the Home tab. */
export function emitHomeTabPress(): void {
  listeners.forEach(fn => fn());
}

export function subscribeToHomeTabPress(listener: Listener): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
