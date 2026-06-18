import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, View, LayoutChangeEvent } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheet } from './index';
import type { BottomSheetMethods } from './types';
import { HANDLE_HEIGHT, SCREEN_HEIGHT } from './conf';

interface ActionSheetModalProps {
  visible: boolean;
  onClose: () => void;
  backdropOpacity?: number;
  showHandle?: boolean;
  /** Receives a `dismiss` callback so rows can animate the sheet closed before firing their action. */
  children: (dismiss: () => void) => React.ReactNode;
}

// A bottom sheet that sizes itself to its content instead of a fixed `%`
// snap point: it first renders the content off-screen to measure its real
// height, then mounts the actual sheet at exactly that height.
export const ActionSheetModal = ({
  visible,
  onClose,
  backdropOpacity = 0.5,
  showHandle = true,
  children,
}: ActionSheetModalProps) => {
  const sheetRef = useRef<BottomSheetMethods>(null);
  const [contentHeight, setContentHeight] = useState<number | null>(null);

  const dismiss = useCallback(() => sheetRef.current?.close(), []);

  const handleMeasure = useCallback((e: LayoutChangeEvent) => {
    const height = Math.ceil(e.nativeEvent.layout.height);
    if (height > 0) setContentHeight((prev) => prev ?? height);
  }, []);

  useEffect(() => {
    if (visible && contentHeight != null) {
      const timer = setTimeout(() => sheetRef.current?.expand(), 0);
      return () => clearTimeout(timer);
    }
  }, [visible, contentHeight]);

  // Re-measure on every open — row count can differ between opens
  // (e.g. the "Unfollow" row only shows up when following).
  useEffect(() => {
    if (!visible) setContentHeight(null);
  }, [visible]);

  if (!visible) return null;

  const snapHeight = contentHeight != null
    ? Math.min(contentHeight + (showHandle ? HANDLE_HEIGHT : 0), SCREEN_HEIGHT * 0.9)
    : null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={dismiss}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        {snapHeight != null && (
          <BottomSheet
            ref={sheetRef}
            snapPoints={[snapHeight] as const}
            onClose={onClose}
            backdropOpacity={backdropOpacity}
            showHandle={showHandle}
          >
            {children(dismiss)}
          </BottomSheet>
        )}

        {snapHeight == null && (
          <View
            onLayout={handleMeasure}
            style={{ position: 'absolute', left: 0, right: 0, top: 0, opacity: 0 }}
            pointerEvents="none"
          >
            {children(dismiss)}
          </View>
        )}
      </GestureHandlerRootView>
    </Modal>
  );
};

export default ActionSheetModal;
