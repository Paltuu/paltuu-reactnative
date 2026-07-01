import React, { useEffect, useRef, useState } from 'react';
import { View, Modal, TouchableWithoutFeedback, StyleSheet, useWindowDimensions } from 'react-native';
import PawrvezSpeechBubble from './PawrvezSpeechBubble';

const ANCHOR_GAP = 10;

interface AnchorLayout {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PawrvezTooltipProps {
  /** Whether the tooltip is currently showing. */
  visible: boolean;
  /** Message Pawrvez says, revealed letter by letter. */
  text: string;
  /** Called when the tooltip should close (backdrop tap or auto-dismiss timeout). */
  onDismiss: () => void;
  /** The element the tooltip points at — rendered in place, untouched. */
  children: React.ReactNode;
  /** Which side of the anchor to render the bubble on. */
  placement?: 'top' | 'bottom';
  /** Auto-hide this many ms after the message finishes typing. 0 disables auto-dismiss. */
  autoDismissDelayMs?: number;
}

/**
 * A gamified tooltip: Pawrvez pops up next to whatever it wraps and "speaks"
 * the given text letter by letter. The mascot + bubble always span the full
 * screen width; only the vertical placement (above/below the anchor) varies.
 * Tap outside (or wait, if autoDismissDelayMs is set) to dismiss.
 */
export const PawrvezTooltip: React.FC<PawrvezTooltipProps> = ({
  visible,
  text,
  onDismiss,
  children,
  placement = 'top',
  autoDismissDelayMs = 1400,
}) => {
  const { height: screenHeight } = useWindowDimensions();
  const anchorRef = useRef<View>(null);
  const [anchor, setAnchor] = useState<AnchorLayout | null>(null);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!visible) return;
    anchorRef.current?.measureInWindow((x, y, width, height) => {
      setAnchor({ x, y, width, height });
    });
  }, [visible]);

  useEffect(() => {
    return () => {
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
    };
  }, []);

  const handleTypingComplete = () => {
    if (autoDismissDelayMs > 0) {
      dismissTimer.current = setTimeout(onDismiss, autoDismissDelayMs);
    }
  };

  const verticalStyle = anchor
    ? placement === 'top'
      ? { bottom: screenHeight - anchor.y + ANCHOR_GAP }
      : { top: anchor.y + anchor.height + ANCHOR_GAP }
    : null;

  return (
    <>
      <View ref={anchorRef} collapsable={false}>
        {children}
      </View>
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
        <TouchableWithoutFeedback onPress={onDismiss}>
          <View style={styles.backdrop}>
            {anchor && verticalStyle && (
              <View style={[styles.bubbleWrap, verticalStyle]}>
                <TouchableWithoutFeedback>
                  <View>
                    <PawrvezSpeechBubble
                      text={text}
                      mascotSize={64}
                      fontSize={9}
                      onTypingComplete={handleTypingComplete}
                    />
                  </View>
                </TouchableWithoutFeedback>
              </View>
            )}
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
  },
  bubbleWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
});

export default PawrvezTooltip;
