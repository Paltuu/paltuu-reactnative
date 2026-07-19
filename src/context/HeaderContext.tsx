import React, { createContext, useContext, useRef, useState, useCallback, useMemo, ReactNode } from 'react';
import {
    useAnimatedScrollHandler,
    useSharedValue,
    withTiming,
    SharedValue,
    runOnUI,
} from 'react-native-reanimated';

export const HEADER_HEIGHT = 60;

interface HeaderContextValue {
    isLoading: boolean;
    setLoading: (v: boolean) => void;
    onPlusPress: () => void;
    onHeartPress: () => void;
    onLogoPress: () => void;
    setOnPlusPress: (fn: () => void) => void;
    setOnHeartPress: (fn: () => void) => void;
    setOnLogoPress: (fn: () => void) => void;
}

const HeaderContext = createContext<HeaderContextValue | null>(null);

export function HeaderProvider({ children }: { children: ReactNode }) {
    const [isLoading, setIsLoading] = useState(false);

    const plusRef = useRef<() => void>(() => {});
    const heartRef = useRef<() => void>(() => {});
    const logoRef = useRef<() => void>(() => {});

    const setLoading = useCallback((v: boolean) => setIsLoading(v), []);
    const setOnPlusPress = useCallback((fn: () => void) => { plusRef.current = fn; }, []);
    const setOnHeartPress = useCallback((fn: () => void) => { heartRef.current = fn; }, []);
    const setOnLogoPress = useCallback((fn: () => void) => { logoRef.current = fn; }, []);
    const onPlusPress = useCallback(() => plusRef.current(), []);
    const onHeartPress = useCallback(() => heartRef.current(), []);
    const onLogoPress = useCallback(() => logoRef.current(), []);

    const contextValue = useMemo(() => ({
        isLoading,
        setLoading,
        onPlusPress,
        onHeartPress,
        onLogoPress,
        setOnPlusPress,
        setOnHeartPress,
        setOnLogoPress,
    }), [isLoading, setLoading, onPlusPress, onHeartPress, onLogoPress, setOnPlusPress, setOnHeartPress, setOnLogoPress]);

    return (
        <HeaderContext.Provider value={contextValue}>
            {children}
        </HeaderContext.Provider>
    );
}

export function useHeaderContext(): HeaderContextValue {
    const ctx = useContext(HeaderContext);
    if (!ctx) throw new Error('useHeaderContext must be used inside <HeaderProvider>');
    return ctx;
}

interface HeaderScroll {
    headerTranslateY: SharedValue<number>;
    scrollHandler: ReturnType<typeof useAnimatedScrollHandler>;
    /** Plain JS callback — use with non-animated lists (e.g. FlashList) */
    handleScrollY: (y: number) => void;
    handleScrollEnd: () => void;
    /** Snaps the header fully visible and forgets the last scroll offset —
     * call on screen focus so a header left hidden from a previous scroll
     * doesn't render already off-screen on the next visit. */
    resetHeader: () => void;
    setHeaderEnabled: (v: boolean) => void;
}

/**
 * Self-contained collapsing-header animation. Each screen that renders a
 * scroll-collapsing header (or drives one rendered nearby) calls this itself
 * to get its own private `headerTranslateY` — screens no longer share one
 * global value, so hiding the header via scroll on one screen can never leak
 * into another screen's header state.
 */
export function useHeaderScroll(): HeaderScroll {
    // 0 = fully visible, -HEADER_HEIGHT = fully hidden
    const headerTranslateY = useSharedValue(0);
    const headerEnabled = useSharedValue(1);
    const lastY = useSharedValue(0);

    const setHeaderEnabled = useCallback((v: boolean) => {
        headerEnabled.value = v ? 1 : 0;
        if (v) headerTranslateY.value = withTiming(0, { duration: 80 });
    }, []);

    const snapHeader = () => {
        'worklet';
        if (headerTranslateY.value === 0 || headerTranslateY.value === -HEADER_HEIGHT) return;
        headerTranslateY.value = withTiming(
            headerTranslateY.value < -HEADER_HEIGHT / 2 ? -HEADER_HEIGHT : 0,
            { duration: 80 }
        );
    };

    const handleScrollY = useCallback((y: number) => {
        runOnUI((yVal: number) => {
            'worklet';
            if (!headerEnabled.value) return;
            const delta = yVal - lastY.value;
            lastY.value = yVal;
            if (yVal <= 0) { headerTranslateY.value = 0; return; }
            headerTranslateY.value = Math.max(
                -HEADER_HEIGHT,
                Math.min(0, headerTranslateY.value - delta)
            );
        })(y);
    }, []);

    const handleScrollEnd = useCallback(() => {
        runOnUI(snapHeader)();
    }, []);

    const resetHeader = useCallback(() => {
        headerTranslateY.value = 0;
        lastY.value = 0;
    }, []);

    const scrollHandler = useAnimatedScrollHandler({
        onScroll: (event) => {
            'worklet';
            if (!headerEnabled.value) return;

            const y = event.contentOffset.y;
            const delta = y - lastY.value;
            lastY.value = y;

            // Always fully visible at the top
            if (y <= 0) {
                headerTranslateY.value = 0;
                return;
            }

            // 1:1 direct tracking — clamp between fully visible and fully hidden
            headerTranslateY.value = Math.max(
                -HEADER_HEIGHT,
                Math.min(0, headerTranslateY.value - delta)
            );
        },
        onEndDrag: () => {
            'worklet';
            snapHeader();
        },
        onMomentumEnd: () => {
            'worklet';
            snapHeader();
        },
    });

    return {
        headerTranslateY,
        scrollHandler,
        handleScrollY,
        handleScrollEnd,
        resetHeader,
        setHeaderEnabled,
    };
}
