import { create } from 'zustand';

// Deliberately NOT persisted to AsyncStorage — in-memory only, so it resets to 'mine' on every
// app restart rather than silently sticking an admin in Team mode across sessions.

interface DispatcherScopeState {
  scope: 'mine' | 'team';
  setScope: (scope: 'mine' | 'team') => void;
}

export const useDispatcherScopeStore = create<DispatcherScopeState>((set) => ({
  scope: 'mine',
  setScope: (scope) => set({ scope }),
}));
