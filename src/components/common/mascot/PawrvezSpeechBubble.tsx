import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image as RNImage,
  StyleProp,
  ViewStyle,
  TextStyle,
  useWindowDimensions,
  NativeSyntheticEvent,
  TextLayoutEventData,
} from 'react-native';
import { Image } from 'expo-image';
import { COLORS } from '../../../constants/colors';
import { FONTS } from '../../../constants/typography';

const mouthClosedIcon = require('../../../../assets/pixel/pawrvez-pixel-mouth-closed.png');
const mouthOpenIcon = require('../../../../assets/pixel/pawrvez-pixel-mouthopen.png');

// Three pre-drawn bubble heights (1/2/3 lines) — same native width, so we
// only ever scale them uniformly by width and never stretch a line count
// they weren't drawn for. 4+ line messages fall back to stretching bubble3.
const bubbleAssets = [
  { source: require('../../../../assets/pixel/bubble1.png'), width: 4317, height: 875 },
  { source: require('../../../../assets/pixel/bubble2.png'), width: 4317, height: 1215 },
  { source: require('../../../../assets/pixel/bubble3.png'), width: 4317, height: 1543 },
];

const DEFAULT_TYPING_SPEED_MS = 35;
// Mouth flips on its own slower cadence, independent of how fast letters
// reveal — flipping once per character reads as a nervous flutter.
const MOUTH_FLIP_INTERVAL_MS = 220;
const MASCOT_BUBBLE_GAP = 6;
const BUBBLE_RIGHT_INSET = 4;
const BUBBLE_RAISE = 20; // bubble sits this many px above the mascot's baseline
const BUBBLE_PADDING_H = 22;
const BUBBLE_PADDING_V = 16;
const BUBBLE_PADDING_BOTTOM_EXTRA = 6; // bubble art has a drop-shadow lip along the bottom edge
// Font scales with the bubble's own width — a narrower bubble (smaller
// mascotSize/width prop) gets smaller text instead of staying fixed size.
const FONT_SCALE_BASELINE_WIDTH = 340;
const FONT_SCALE_MIN = 0.55;
const FONT_SCALE_MAX = 0.9;

export interface PawrvezSpeechBubbleProps {
  /** Full message to type out letter by letter. */
  text: string;
  /** Milliseconds between each revealed character. */
  typingSpeedMs?: number;
  /** Diameter of the mascot avatar. */
  mascotSize?: number;
  /** Font size of the bubble text. */
  fontSize?: number;
  /** Total width the mascot + bubble row should occupy. Defaults to the full window width. */
  width?: number;
  /** Fired once the full message has been typed out. */
  onTypingComplete?: () => void;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

/**
 * Pawrvez mascot + speech bubble with a letter-by-letter "typing" reveal.
 * The mascot's mouth flips open/closed in sync with each revealed
 * (non-whitespace) character so it reads as speaking, not just typing.
 *
 * This is the shared visual used by both PawrvezTooltip and PawrvezDialog.
 * Always spans the full given width (screen width by default) — the bubble
 * art comes in 1/2/3-line variants that are picked to match the message
 * instead of stretching a single bubble to fit.
 */
export const PawrvezSpeechBubble: React.FC<PawrvezSpeechBubbleProps> = ({
  text,
  typingSpeedMs = DEFAULT_TYPING_SPEED_MS,
  mascotSize = 56,
  fontSize = 8,
  width,
  onTypingComplete,
  style,
  textStyle,
}) => {
  const { width: screenWidth } = useWindowDimensions();
  const rowWidth = width ?? screenWidth;
  const bubbleWidth = rowWidth - mascotSize - MASCOT_BUBBLE_GAP - BUBBLE_RIGHT_INSET;
  const fontScale = Math.min(
    FONT_SCALE_MAX,
    Math.max(FONT_SCALE_MIN, bubbleWidth / FONT_SCALE_BASELINE_WIDTH)
  );
  const scaledFontSize = Math.round(fontSize * fontScale);

  const [visibleChars, setVisibleChars] = useState(0);
  const [mouthOpen, setMouthOpen] = useState(false);
  const [lineCount, setLineCount] = useState(1);
  const onTypingCompleteRef = useRef(onTypingComplete);
  onTypingCompleteRef.current = onTypingComplete;

  const textStyleMerged = [styles.text, { fontSize: scaledFontSize }, textStyle];

  const handleMeasuredLayout = (e: NativeSyntheticEvent<TextLayoutEventData>) => {
    setLineCount(e.nativeEvent.lines.length || 1);
  };

  useEffect(() => {
    setVisibleChars(0);
    if (!text) return;

    let i = 0;
    const interval = setInterval(() => {
      i += 1;
      setVisibleChars(i);
      if (i >= text.length) {
        clearInterval(interval);
        onTypingCompleteRef.current?.();
      }
    }, typingSpeedMs);

    return () => clearInterval(interval);
  }, [text, typingSpeedMs]);

  const isTyping = visibleChars < text.length;

  // Mouth flip runs on its own slower interval so it doesn't flutter once
  // per revealed character — just needs to look like talking, not lip-sync.
  useEffect(() => {
    if (!isTyping) {
      setMouthOpen(false);
      return;
    }
    const mouthInterval = setInterval(() => {
      setMouthOpen((prev) => !prev);
    }, MOUTH_FLIP_INTERVAL_MS);
    return () => clearInterval(mouthInterval);
  }, [isTyping]);

  const variantIndex = Math.min(lineCount, bubbleAssets.length) - 1;
  const variant = bubbleAssets[variantIndex];
  const scale = bubbleWidth / variant.width;
  let bubbleHeight = variant.height * scale + 15;
  // 4+ lines: no art drawn that tall, so stretch bubble3 vertically as a fallback.
  if (lineCount > bubbleAssets.length) {
    const extraLines = lineCount - bubbleAssets.length;
    bubbleHeight += extraLines * scaledFontSize * 1.6;
  }

  return (
    <View style={[styles.row, { width: rowWidth }, style]}>
      <Image
        source={mouthOpen ? mouthOpenIcon : mouthClosedIcon}
        style={{ width: mascotSize, height: mascotSize }}
        contentFit="contain"
      />
      <View
        style={{
          width: bubbleWidth,
          height: bubbleHeight,
          marginLeft: MASCOT_BUBBLE_GAP,
          marginBottom: BUBBLE_RAISE,
        }}
      >
        <RNImage
          source={variant.source}
          resizeMode="stretch"
          style={[styles.bubbleBg, { width: bubbleWidth, height: bubbleHeight }]}
        />
        <View style={styles.bubbleTextWrap}>
          <Text style={textStyleMerged}>{text.slice(0, visibleChars)}</Text>
        </View>
      </View>

      {/* Off-screen probe: measures how many lines the FULL message wraps to
          at this bubble width, so the right bubble variant is picked up
          front instead of resizing mid-type. */}
      <Text
        style={[textStyleMerged, styles.measureProbe, { width: bubbleWidth - BUBBLE_PADDING_H * 2 }]}
        onTextLayout={handleMeasuredLayout}
      >
        {text}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  bubbleBg: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  bubbleTextWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    paddingHorizontal: BUBBLE_PADDING_H,
    paddingTop: BUBBLE_PADDING_V,
    paddingBottom: BUBBLE_PADDING_V + BUBBLE_PADDING_BOTTOM_EXTRA,
  },
  text: {
    fontFamily: FONTS.pixel,
    color: COLORS.gray[900],
  },
  measureProbe: {
    position: 'absolute',
    opacity: 0,
    left: -9999,
  },
});

export default PawrvezSpeechBubble;
