import React, { createContext, useContext, useRef, useState, useCallback, ReactNode } from 'react';
import {
    useAnimatedScrollHandler,
    useSharedValue,
    withTiming,
    SharedValue,
} from 'react-native-reanimated';

export const HEADER_HEIGHT = 60;

interface HeaderContextValue {
    headerTranslateY: SharedValue<number>;
    isLoading: boolean;
    setLoading: (v: boolean) => void;
    scrollHandler: ReturnType<typeof useAnimatedScrollHandler>;
    onPlusPress: () => void;
    onHeartPress: () => void;
    setOnPlusPress: (fn: () => void) => void;
    setOnHeartPress: (fn: () => void) => void;
    setHeaderEnabled: (v: boolean) => void;
}

const HeaderContext = createContext<HeaderContextValue | null>(null);

export function HeaderProvider({ children }: { children: ReactNode }) {
    const [isLoading, setIsLoading] = useState(false);

    // 0 = fully visible, -HEADER_HEIGHT = fully hidden
    const headerTranslateY = useSharedValue(0);
    const headerEnabled = useSharedValue(1);
    const lastY = useSharedValue(0);

    const plusRef = useRef<() => void>(() => {});
    const heartRef = useRef<() => void>(() => {});

    const setLoading = useCallback((v: boolean) => setIsLoading(v), []);
    const setOnPlusPress = useCallback((fn: () => void) => { plusRef.current = fn; }, []);
    const setOnHeartPress = useCallback((fn: () => void) => { heartRef.current = fn; }, []);

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

    return (
        <HeaderContext.Provider
            value={{
                headerTranslateY,
                isLoading,
                setLoading,
                scrollHandler,
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

export function useHeaderContext(): HeaderContextValue {
    const ctx = useContext(HeaderContext);
    if (!ctx) throw new Error('useHeaderContext must be used inside <HeaderProvider>');
    return ctx;
}
