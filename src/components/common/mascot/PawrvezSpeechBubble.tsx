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

// Three pre-drawn bubble heights (1/2/3 lines). All share the SAME border art
// and native width, so they scale uniformly by width and are never stretched to
// a line count they weren't drawn for. Messages are guaranteed ≤ 3 lines.
const ART_NATIVE_WIDTH = 4317;
const bubbleAssets = [
  { source: require('../../../../assets/pixel/bubble1.png'), height: 875 },
  { source: require('../../../../assets/pixel/bubble2.png'), height: 1215 },
  { source: require('../../../../assets/pixel/bubble3.png'), height: 1543 },
];

// Interior (white text area) insets measured from the bubble art, in NATIVE px
// at ART_NATIVE_WIDTH. These are identical across all three bubbles because they
// share the same border/tail/shadow art — so scaling them by the on-screen
// scale factor places text pixel-consistently in every variant.
const ART_INTERIOR_TOP = 85;
const ART_INTERIOR_LEFT = 168;
const ART_INTERIOR_RIGHT = 88;
const ART_INTERIOR_BOTTOM = 384; // dead zone below the text area: tail + drop shadow
const TEXT_LEFT_PADDING = 8; // extra left padding so text doesn't hug the border

const DEFAULT_TYPING_SPEED_MS = 35;
// Mouth flips on its own slower cadence, independent of how fast letters
// reveal — flipping once per character reads as a nervous flutter.
const MOUTH_FLIP_INTERVAL_MS = 220;
const MASCOT_BUBBLE_GAP = 6;
const BUBBLE_RIGHT_INSET = 6; // keeps the bubble off the screen's right edge
const BUBBLE_RAISE = 5; // bubble sits this many px above the mascot's baseline
// Font scales with the bubble's own width — a narrower bubble (bigger mascot /
// narrower width prop) gets smaller text instead of staying fixed size.
const FONT_SCALE_BASELINE_WIDTH = 340;
const FONT_SCALE_MIN = 0.7;
const FONT_SCALE_MAX = 1.15;

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
 * The mascot's mouth flips open/closed while typing so it reads as speaking.
 *
 * Shared visual for both PawrvezTooltip and PawrvezDialog. Spans the full given
 * width (screen width by default). The bubble art comes in 1/2/3-line variants;
 * the message is measured off-screen up front to pick the variant that fits its
 * wrapped line count, and the text is placed in the art's real interior (top
 * aligned, starting at the very top of the bubble).
 */
export const PawrvezSpeechBubble: React.FC<PawrvezSpeechBubbleProps> = ({
  text,
  typingSpeedMs = DEFAULT_TYPING_SPEED_MS,
  mascotSize = 56,
  fontSize = 14,
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

  // Everything (art + interior insets) scales by this single factor.
  const artScale = bubbleWidth / ART_NATIVE_WIDTH;
  const padTop = ART_INTERIOR_TOP * artScale;
  const padLeft = ART_INTERIOR_LEFT * artScale + TEXT_LEFT_PADDING;
  const padRight = ART_INTERIOR_RIGHT * artScale;
  const padBottom = ART_INTERIOR_BOTTOM * artScale;
  const interiorTextWidth = bubbleWidth - padLeft - padRight;

  const [visibleChars, setVisibleChars] = useState(0);
  const [mouthOpen, setMouthOpen] = useState(false);
  const [lineCount, setLineCount] = useState(1);
  const onTypingCompleteRef = useRef(onTypingComplete);
  onTypingCompleteRef.current = onTypingComplete;

  const textStyleMerged = [styles.text, { fontSize: scaledFontSize }, textStyle];

  const handleMeasuredLayout = (e: NativeSyntheticEvent<TextLayoutEventData>) => {
    // Clamp to the 3 drawn variants — messages are guaranteed ≤ 3 lines.
    const measured = Math.min(Math.max(e.nativeEvent.lines.length, 1), bubbleAssets.length);
    setLineCount(measured);
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

  const variant = bubbleAssets[lineCount - 1];
  const bubbleHeight = variant.height * artScale;

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
        {/* Text sits in the art's real interior box, top-aligned so it always
            starts at the very top of the bubble. */}
        <View
          style={[
            styles.bubbleTextWrap,
            { paddingTop: padTop, paddingLeft: padLeft, paddingRight: padRight, paddingBottom: padBottom },
          ]}
        >
          <Text style={textStyleMerged}>{text.slice(0, visibleChars)}</Text>
        </View>
      </View>

      {/* Off-screen probe: measures how many lines the FULL message wraps to at
          the exact interior text width, so the right bubble variant is picked
          up front instead of resizing mid-type. */}
      <Text
        style={[textStyleMerged, styles.measureProbe, { width: interiorTextWidth }]}
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
    justifyContent: 'flex-start',
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
