type Listener = () => void;
type TabKey = 'home' | 'pets' | 'search' | 'profile';

const listenersByTab: Partial<Record<TabKey, Set<Listener>>> = {};

/** Fired when a tab icon is pressed while already on that tab. */
export function emitTabPress(tab: TabKey): void {
  listenersByTab[tab]?.forEach(fn => fn());
}

export function subscribeToTabPress(tab: TabKey, listener: Listener): () => void {
  const set = listenersByTab[tab] ?? (listenersByTab[tab] = new Set());
  set.add(listener);
  return () => { set.delete(listener); };
}
