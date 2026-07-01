import React from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import PawrvezSpeechBubble from './PawrvezSpeechBubble';
import { COLORS } from '../../../constants/colors';
import { FONTS } from '../../../constants/typography';

export interface PawrvezDialogProps {
  visible: boolean;
  /** Message Pawrvez says, revealed letter by letter. */
  text: string;
  onDismiss: () => void;
  /** Label for the single CTA button. Omit to just show a "tap to continue" hint. */
  actionLabel?: string;
  onAction?: () => void;
  /** Tapping the dimmed backdrop dismisses the dialog. Default true. */
  dismissOnBackdropPress?: boolean;
}

/**
 * Full-screen gamified alert/dialog: Pawrvez pops up center-screen behind a
 * dimmed backdrop and "speaks" the message letter by letter, mouth flipping
 * open/closed as it talks.
 */
export const PawrvezDialog: React.FC<PawrvezDialogProps> = ({
  visible,
  text,
  onDismiss,
  actionLabel,
  onAction,
  dismissOnBackdropPress = true,
}) => {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <Pressable
        style={styles.backdrop}
        onPress={dismissOnBackdropPress ? onDismiss : undefined}
      >
        <Animated.View
          entering={ZoomIn.duration(280)}
          style={styles.card}
        >
          <Pressable onPress={() => {}}>
            <PawrvezSpeechBubble
              text={text}
              mascotSize={72}
              fontSize={10}
              style={styles.bubbleRow}
            />
            <Animated.View entering={FadeIn.delay(200).duration(200)}>
              {actionLabel ? (
                <Pressable style={styles.actionButton} onPress={onAction ?? onDismiss}>
                  <Text style={styles.actionLabel}>{actionLabel}</Text>
                </Pressable>
              ) : (
                <Text style={styles.hint}>tap to continue</Text>
              )}
            </Animated.View>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: '100%',
  },
  bubbleRow: {
    alignItems: 'flex-end',
  },
  actionButton: {
    alignSelf: 'center',
    marginTop: 16,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  actionLabel: {
    fontFamily: FONTS.pixel,
    color: COLORS.white,
    fontSize: 14,
  },
  hint: {
    marginTop: 12,
    textAlign: 'center',
    fontFamily: FONTS.pixel,
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
  },
});

export default PawrvezDialog;
