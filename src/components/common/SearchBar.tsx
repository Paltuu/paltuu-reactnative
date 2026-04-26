import React, { useState, useRef, useEffect } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Text,
  Dimensions,
  Platform,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  useAnimatedProps,
} from "react-native-reanimated";
import { SymbolView } from "expo-symbols";
import { BlurView, type BlurViewProps } from "expo-blur";
import type { SearchBarProps } from "./SearchBar.types";
import { runOnJS } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);
const AnimatedView = Animated.createAnimatedComponent(View);
const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);
const AnimatedBlurView =
  Animated.createAnimatedComponent<BlurViewProps>(BlurView);

const { width: screenWidth } = Dimensions.get("window");

export const SearchBar = ({
  placeholder = "Search",
  onSearch,
  onClear,
  style,
  renderLeadingIcons,
  renderTrailingIcons,
  onSearchDone = () => {},
  onSearchMount = () => {},
  containerWidth,
  focusedWidth,
  cancelButtonWidth = 68,
  enableWidthAnimation = true,
  centerWhenUnfocused = true,
  ...props
}: SearchBarProps) => {
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [containerDimensions, setContainerDimensions] = useState({ width: 0 });
  const inputRef = useRef<TextInput>(null);

  const focusProgress = useSharedValue(0);
  const clearButtonScale = useSharedValue(0);
  const clearButtonOpacity = useSharedValue(0);
  const textOpacity = useSharedValue(1);
  const textScale = useSharedValue(1);
  const textTranslateY = useSharedValue(0);
  const currentWidth = useSharedValue(containerWidth || screenWidth - 32);

  useEffect(() => {
    if (containerWidth) {
      currentWidth.value = containerWidth;
    } else if (containerDimensions.width > 0) {
      currentWidth.value = containerDimensions.width;
    }
  }, [containerWidth, containerDimensions.width]);

  const animatedContainerStyle = useAnimatedStyle(() => {
    if (!enableWidthAnimation) {
      return { width: currentWidth.value };
    }

    const searchBarWidth = interpolate(
      focusProgress.value,
      [0, 1],
      [
        currentWidth.value,
        focusedWidth || currentWidth.value - cancelButtonWidth,
      ],
    );
    return { width: searchBarWidth };
  });

  const animatedCancelStyle = useAnimatedStyle(() => {
    const opacity = interpolate(focusProgress.value, [0, 0.5, 1], [0, 0, 1]);
    const translateX = interpolate(focusProgress.value, [0, 1], [20, 0]);
    return {
      opacity,
      transform: [{ translateX }],
    };
  });

  const animatedBlurViewProps = useAnimatedProps(() => {
    const blurAmount = withSpring(
      interpolate(focusProgress.value, [0, 0.3, 0.5, 1], [0, 20, 30, 0]),
    );
    return {
      intensity: blurAmount,
    };
  });

  const animatedSearchContentStyle = useAnimatedStyle(() => {
    return { 
      paddingLeft: interpolate(focusProgress.value, [0, 1], [0, 12]),
      justifyContent: 'flex-start', // Always flex-start, we use translation for centering
    };
  });

  const animatedInputWrapperStyle = useAnimatedStyle(() => {
    if (!centerWhenUnfocused) return { transform: [{ translateX: 0 }] };
    
    // Use a fallback width if currentWidth hasn't been measured yet
    const viewWidth = currentWidth.value > 0 ? currentWidth.value : (screenWidth - 32);
    
    // Approximate width of "Search" text + icon
    const centeredContentWidth = 80; 
    const centerOffset = (viewWidth / 2) - (centeredContentWidth / 2) - 20;

    const translateX = interpolate(
      focusProgress.value,
      [0, 1],
      [centerOffset, 0],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
    );

    return {
      transform: [{ translateX }],
    };
  });

  const animatedIconStyle = useAnimatedStyle(() => {
    if (!centerWhenUnfocused) return { transform: [{ translateX: 0 }] };
    
    const viewWidth = currentWidth.value > 0 ? currentWidth.value : (screenWidth - 32);
    const centeredContentWidth = 80;
    const centerOffset = (viewWidth / 2) - (centeredContentWidth / 2) - 20;

    const translateX = interpolate(
      focusProgress.value,
      [0, 1],
      [centerOffset, 0],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
    );

    return {
      transform: [{ translateX }],
    };
  });

  const animatedPlaceholderStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(focusProgress.value, [0, 0.2], [1, 0]),
      // We hide it completely when focused to prevent any overlap
      transform: [{ scale: interpolate(focusProgress.value, [0, 0.2], [1, 0.8]) }]
    };
  });

  const animatedActualInputStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(focusProgress.value, [0.4, 1], [0, 1]),
    };
  });

  const animatedClearButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: clearButtonScale.value }],
    opacity: clearButtonOpacity.value,
  }));

  const animatedInputStyle = useAnimatedStyle(() => {
    return {
      opacity: textOpacity.value,
      transform: [
        { scale: textScale.value },
        { translateY: textTranslateY.value },
      ],
    };
  });

  const handleFocus = () => {
    onSearchMount();
    setIsFocused(true);
    focusProgress.value = withSpring(1, {
      damping: 20,
      stiffness: 150,
      mass: 1,
    });
  };

  const handleCancel = () => {
    inputRef.current?.blur();
    setIsFocused(false);
    setQuery("");
    onSearchDone();
    onClear?.();
    focusProgress.value = withTiming(0, { duration: 300 });
    clearButtonScale.value = withTiming(0);
    clearButtonOpacity.value = withTiming(0, { duration: 200 });
  };

  const handleBlur = () => {
    if (!query) handleCancel();
  };

  const handleChangeText = (text: string) => {
    setQuery(text);
    if (text.length > 0) {
      clearButtonScale.value = withSpring(1);
      clearButtonOpacity.value = withTiming(1, { duration: 200 });
      textOpacity.value = withTiming(1, { duration: 150 });
    } else {
      clearButtonScale.value = withSpring(0);
      clearButtonOpacity.value = withTiming(0, { duration: 200 });
    }

    onSearch?.(text);
  };

  const handleClear = () => {
    runOnJS(setQuery)("");
    clearButtonScale.value = withTiming(0);
    clearButtonOpacity.value = withTiming(0, { duration: 200 });
    onClear?.();
    inputRef.current?.focus();
  };

  const handleLayout = (event: any) => {
    const { width } = event.nativeEvent.layout;
    setContainerDimensions({ width });
  };

  const animatedAndroidBlurStylez = useAnimatedStyle(() => ({
    opacity: interpolate(focusProgress.value, [0, 0.5, 1], [1, 0.8, 1]),
  }));

  return (
    <View style={[styles.container, style]} onLayout={handleLayout}>
      <View style={styles.searchRow}>
        <AnimatedView
          style={[
            styles.searchBarContainer,
            animatedContainerStyle,
            Platform.OS === "android" && animatedAndroidBlurStylez,
          ]}
        >
          <BlurView
            intensity={20}
            tint="light"
            style={styles.blurContainer}
          >
            <View style={styles.searchContainer}>
              <AnimatedView
                style={[styles.searchContent, animatedSearchContentStyle]}
              >
                <AnimatedView
                  style={[
                    styles.searchIconContainer,
                    animatedIconStyle,
                    props?.iconStyle,
                  ]}
                >
                  <Ionicons name="search" size={18} color="#8E8E93" />
                </AnimatedView>

                <AnimatedView style={[{ flex: 1, position: 'relative' }, animatedInputWrapperStyle]}>
                  {/* Centered "Search" placeholder overlay */}
                  <AnimatedView 
                    pointerEvents="none"
                    style={[{ position: 'absolute', left: 0, top: 0, bottom: 0, justifyContent: 'center' }, animatedPlaceholderStyle]}
                  >
                    <Text style={{ color: '#8E8E93', fontSize: 16 }}>Search</Text>
                  </AnimatedView>

                    <AnimatedTextInput
                    ref={inputRef}
                    style={[
                      styles.input,
                      animatedInputStyle,
                      animatedActualInputStyle,
                      props?.inputStyle,
                    ]}
                    cursorColor={props?.tint ?? "#A03048"}
                    placeholder={placeholder}
                    placeholderTextColor={isFocused ? "#8E8E93" : "transparent"}
                    value={query}
                    onChangeText={handleChangeText}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    returnKeyType="search"
                    autoCorrect={false}
                    autoCapitalize="none"
                    selectionColor={props?.tint ?? "#A03048"}
                    {...props}
                  />
                </AnimatedView>

                {Platform.OS === "ios" && (
                  <AnimatedBlurView
                    style={[
                      StyleSheet.absoluteFillObject,
                      {
                        overflow: "hidden",
                      },
                    ]}
                    animatedProps={animatedBlurViewProps}
                    pointerEvents={"none"}
                  />
                )}
                {query.length > 0 && (
                  <AnimatedTouchable
                    onPress={handleClear}
                    style={[styles.clearButton, animatedClearButtonStyle]}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="close-circle" size={18} color="#8E8E93" />
                  </AnimatedTouchable>
                )}
              </AnimatedView>
            </View>
          </BlurView>
        </AnimatedView>

        <AnimatedView
          style={[styles.cancelButtonContainer, animatedCancelStyle]}
        >
          <TouchableOpacity
            onPress={handleCancel}
            style={styles.cancelButton}
            activeOpacity={0.6}
            hitSlop={{ top: 10, bottom: 10, left: 5, right: 5 }}
          >
            <Text
              style={[
                styles.cancelText,
                {
                  color: props?.tint ?? "#A03048",
                },
              ]}
            >
              Cancel
            </Text>
          </TouchableOpacity>
        </AnimatedView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    paddingHorizontal: 0,
    paddingVertical: 8,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  searchBarContainer: {},
  blurContainer: {
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: '#F3F4F6', // Light gray background
  },
  searchContainer: {
    borderRadius: 12,
    minHeight: 40,
    justifyContent: "center",
  },
  searchContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 10 : 8,
  },
  searchIconContainer: {
    width: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  input: {
    width: "100%",
    color: "#111111", // Dark text for light mode
    fontSize: 16,
    fontFamily: "System",
    fontWeight: "400",
    includeFontPadding: false,
    textAlignVertical: "center",
    minHeight: 24,
    textAlign: "left",
  },
  clearButton: {
    paddingVertical: 2,
    paddingHorizontal: 4,
    marginLeft: 4,
  },
  cancelButtonContainer: {
    paddingLeft: 12,
    minWidth: 60,
    justifyContent: "center",
    alignItems: "flex-start",
  },
  cancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 0,
  },
  cancelText: {
    fontSize: 16,
    fontFamily: "System",
    fontWeight: "600",
  },
});
