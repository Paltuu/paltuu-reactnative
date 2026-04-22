// src/context/HeaderContext.tsx
import React, {
    createContext,
    useContext,
    useRef,
    useState,
    useCallback,
    ReactNode,
} from 'react';
import { NativeSyntheticEvent, NativeScrollEvent } from 'react-native';

// ─── Types ─────────────────────────────────────────────────────────────────
interface HeaderContextValue {
    isVisible: boolean;
    isLoading: boolean;
    setLoading: (v: boolean) => void;
    /** Pass directly to ScrollView / FlatList onScroll prop */
    onScroll: (e: NativeSyntheticEvent<NativeScrollEvent>) => void;
    onPlusPress: () => void;
    onHeartPress: () => void;
    setOnPlusPress: (fn: () => void) => void;
    setOnHeartPress: (fn: () => void) => void;
    /** Call with false on screens that should never show the header */
    setHeaderEnabled: (v: boolean) => void;
}

const HeaderContext = createContext<HeaderContextValue | null>(null);

// ─── Physics ────────────────────────────────────────────────────────────────
// How many px of downward scroll before we hide.
const HIDE_THRESHOLD = 4;

// How many px of UPWARD scroll must accumulate before we reveal again.
// High value = user must scroll up deliberately before header reappears.
const REVEAL_THRESHOLD = 60;

// Don't hide until user has scrolled at least this far from top.
const HIDE_AFTER_PX = 60;

// ─── Provider ───────────────────────────────────────────────────────────────
export function HeaderProvider({ children }: { children: ReactNode }) {
    const [isVisible, setIsVisible] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [headerEnabled, setHeaderEnabled] = useState(true);

    // Refs keep scroll tracking out of the render cycle
    const lastY = useRef(0);
    const lastDir = useRef<'up' | 'down' | null>(null);
    const accumulated = useRef(0);

    const plusRef = useRef<() => void>(() => { });
    const heartRef = useRef<() => void>(() => { });

    const setLoading = useCallback((v: boolean) => setIsLoading(v), []);
    const setOnPlusPress = useCallback((fn: () => void) => { plusRef.current = fn; }, []);
    const setOnHeartPress = useCallback((fn: () => void) => { heartRef.current = fn; }, []);

    const onScroll = useCallback(
        (e: NativeSyntheticEvent<NativeScrollEvent>) => {
            if (!headerEnabled) return;

            const y = e.nativeEvent.contentOffset.y;
            const delta = y - lastY.current;

            // At the very top — always show, reset everything
            if (y <= 0) {
                setIsVisible(true);
                accumulated.current = 0;
                lastDir.current = null;
                lastY.current = y;
                return;
            }

            const dir = delta > 0 ? 'down' : 'up';

            // Direction changed — reset accumulator
            if (dir !== lastDir.current) {
                accumulated.current = 0;
                lastDir.current = dir;
            }

            accumulated.current += Math.abs(delta);

            // Only act once we've crossed the direction-specific threshold
            if (dir === 'down' && accumulated.current >= HIDE_THRESHOLD && y > HIDE_AFTER_PX) {
                setIsVisible(false);
            } else if (dir === 'up' && accumulated.current >= REVEAL_THRESHOLD) {
                setIsVisible(true);
            }

            lastY.current = y;
        },
        [headerEnabled],
    );

    return (
        <HeaderContext.Provider
            value={{
                isVisible,
                isLoading,
                setLoading,
                onScroll,
                onPlusPress: () => plusRef.current(),
                onHeartPress: () => heartRef.current(),
                setOnPlusPress,
                setOnHeartPress,
                setHeaderEnabled,
            }}
        >
            {children}
        </HeaderContext.Provider>
    );
}

// ─── Hook ───────────────────────────────────────────────────────────────────
export function useHeaderContext(): HeaderContextValue {
    const ctx = useContext(HeaderContext);
    if (!ctx) throw new Error('useHeaderContext must be used inside <HeaderProvider>');
    return ctx;
}