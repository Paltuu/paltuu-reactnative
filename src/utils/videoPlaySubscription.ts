type Listener = (id: string | null) => void;
const listeners = new Set<Listener>();
let current: string | null = null;

export function setPlayingPostId(id: string | null): void {
  current = id;
  listeners.forEach(fn => fn(id));
}

export function subscribeToPlayingPost(listener: Listener): () => void {
  listeners.add(listener);
  listener(current);
  return () => { listeners.delete(listener); };
}
