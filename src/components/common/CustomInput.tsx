import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  Animated,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface CustomInputProps extends TextInputProps {
  label: string;
  error?: string;
  containerClassName?: string;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  prefix?: string;
  /** Forces password eye-toggle — already handled internally for secureTextEntry */
  /** Web-style floating label that sits on the border instead of above the field (used on the login screen). */
  floating?: boolean;
  /** Background painted behind the floated label so it "cuts" the border line. Only used with `floating`. */
  floatingBg?: string;
  /** 'outline' swaps the flat grey fill for a white field with a soft brand-tinted border. */
  variant?: 'default' | 'outline';
}

export const CustomInput: React.FC<CustomInputProps> = ({
  label,
  error,
  containerClassName = '',
  leftIcon,
  prefix,
  secureTextEntry,
  floating = false,
  floatingBg = '#FFFFFF',
  variant = 'default',
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isSecure, setIsSecure] = useState(secureTextEntry ?? false);
  const borderAnim = useRef(new Animated.Value(0)).current;
  const labelAnim = useRef(new Animated.Value(0)).current;

  const hasValue = typeof props.value === 'string' && props.value.length > 0;

  const handleFocus = (e: any) => {
    setIsFocused(true);
    Animated.timing(borderAnim, {
      toValue: 1,
      duration: 180,
      useNativeDriver: false,
    }).start();
    props.onFocus?.(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    Animated.timing(borderAnim, {
      toValue: 0,
      duration: 180,
      useNativeDriver: false,
    }).start();
    props.onBlur?.(e);
  };

  useEffect(() => {
    Animated.timing(labelAnim, {
      toValue: isFocused || hasValue ? 1 : 0,
      duration: 180,
      useNativeDriver: false,
    }).start();
  }, [isFocused, hasValue, labelAnim]);

  const borderColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [
      error ? '#EF4444' : '#E5E7EB',
      error ? '#EF4444' : '#a03048',
    ],
  });

  const iconColor = error
    ? '#EF4444'
    : isFocused
    ? '#a03048'
    : variant === 'outline'
    ? '#C98A97'
    : '#9CA3AF';

  const shadowOpacity = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.12],
  });

  if (floating) {
    const floatingBorderColor = borderAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [error ? '#EF4444' : '#D1D5DB', error ? '#EF4444' : '#a03048'],
    });
    const floatingBorderWidth = borderAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 2],
    });
    const labelTop = labelAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [16, -9],
    });
    const labelFontSize = labelAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [15, 12],
    });
    const labelColor = labelAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [error ? '#EF4444' : '#9CA3AF', error ? '#EF4444' : '#a03048'],
    });

    return (
      <View style={floatingStyles.container}>
        <Animated.View
          style={[
            floatingStyles.wrapper,
            { borderColor: floatingBorderColor, borderWidth: floatingBorderWidth },
          ]}
        >
          <TextInput
            style={floatingStyles.input}
            placeholder=""
            secureTextEntry={isSecure}
            onFocus={handleFocus}
            onBlur={handleBlur}
            {...props}
          />

          {secureTextEntry && (
            <TouchableOpacity
              onPress={() => setIsSecure((v) => !v)}
              style={styles.eyeBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name={isSecure ? 'eye-off-outline' : 'eye-outline'}
                size={18}
                color={isFocused ? '#a03048' : '#9CA3AF'}
              />
            </TouchableOpacity>
          )}
        </Animated.View>

        <Animated.Text
          pointerEvents="none"
          style={[
            floatingStyles.label,
            {
              top: labelTop,
              fontSize: labelFontSize,
              color: labelColor,
              backgroundColor: floatingBg,
            },
          ]}
        >
          {label}
        </Animated.Text>

        {error ? (
          <View style={styles.errorRow}>
            <Ionicons name="alert-circle" size={12} color="#EF4444" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <View style={[styles.container, containerClassName ? undefined : undefined]}>
      {/* Label */}
      <Text style={[styles.label, isFocused && styles.labelFocused, error ? styles.labelError : null]}>
        {label}
      </Text>

      {/* Input wrapper */}
      <Animated.View
        style={[
          styles.inputWrapper,
          variant === 'outline' && styles.inputWrapperOutline,
          { borderColor, shadowOpacity, shadowColor: '#a03048' },
          isFocused && styles.inputWrapperFocused,
          error ? styles.inputWrapperError : null,
        ]}
      >
        {leftIcon && (
          <Ionicons
            name={leftIcon}
            size={18}
            color={iconColor}
            style={styles.leftIcon}
          />
        )}

        {prefix && (
          <Text style={[styles.prefix, isFocused && styles.prefixFocused]}>
            {prefix}
          </Text>
        )}

        <TextInput
          style={[styles.input, leftIcon ? styles.inputWithIcon : null]}
          placeholderTextColor="#B0B7C3"
          secureTextEntry={isSecure}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...props}
        />

        {/* Password visibility toggle */}
        {secureTextEntry && (
          <TouchableOpacity
            onPress={() => setIsSecure((v) => !v)}
            style={styles.eyeBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={isSecure ? 'eye-off-outline' : 'eye-outline'}
              size={18}
              color={isFocused ? '#a03048' : '#9CA3AF'}
            />
          </TouchableOpacity>
        )}
      </Animated.View>

      {/* Error message */}
      {error ? (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle" size={12} color="#EF4444" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 10,
    width: '100%',
  },
  label: {
    fontSize: 12,
    fontFamily: 'Montserrat_600SemiBold',
    color: '#6B7280',
    marginBottom: 5,
    letterSpacing: 0.3,
  },
  labelFocused: {
    color: '#a03048',
  },
  labelError: {
    color: '#EF4444',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    paddingHorizontal: 14,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    elevation: 0,
  },
  inputWrapperFocused: {
    backgroundColor: '#FFFFFF',
    elevation: 4,
  },
  inputWrapperOutline: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
  },
  inputWrapperError: {
    borderColor: '#EF4444',
    backgroundColor: '#FFF5F5',
  },
  leftIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 42,
    fontSize: 15,
    fontFamily: 'DMSans_400Regular',
    color: '#111827',
  },
  inputWithIcon: {
    // Slight left padding handled by icon margin
  },
  prefix: {
    fontSize: 15,
    fontFamily: 'DMSans_700Bold',
    color: '#9CA3AF',
    marginRight: 4,
  },
  prefixFocused: {
    color: '#a03048',
  },
  eyeBtn: {
    marginLeft: 8,
    padding: 2,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 4,
  },
  errorText: {
    fontSize: 11,
    fontFamily: 'Montserrat_400Regular',
    color: '#EF4444',
  },
});

const floatingStyles = StyleSheet.create({
  container: {
    marginBottom: 20,
    width: '100%',
  },
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
  },
  input: {
    flex: 1,
    height: 50,
    paddingTop: 16,
    paddingBottom: 10,
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: '#1F2937',
  },
  label: {
    position: 'absolute',
    left: 12,
    fontFamily: 'DMSans_400Regular',
    paddingHorizontal: 4,
  },
});

export default CustomInput;
