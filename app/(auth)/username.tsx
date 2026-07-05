import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  KeyboardAvoidingView,
  Keyboard,
  KeyboardEvent,
  Platform,
  Alert,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import PaltuuButton from '../../src/components/ui/PaltuuButton';
import { OnboardingHeader } from '../../src/components/auth/OnboardingHeader';
import { UsernameField, UsernameFieldState } from '../../src/components/auth/UsernameField';
import { PawrvezSpeechBubble } from '../../src/components/common/mascot';
import { useAuthActions } from '../../src/hooks/useAuth';

const MASCOT_TIP = 'Pick something fun — this is how the community will know you';
const AUTO_DISMISS_MS = 1800;

export default function UsernameScreen() {
  const { name, email, password } = useLocalSearchParams<{
    name: string;
    email: string;
    password: string;
  }>();

  const [field, setField] = useState<UsernameFieldState>({ value: '', canContinue: false });
  const [showMascotTooltip, setShowMascotTooltip] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();
  const { sendOtp } = useAuthActions();

  // Surface the mascot tip the moment the keyboard opens, right above it —
  // and drop it again as soon as the keyboard closes.
  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e: KeyboardEvent) => {
        setKeyboardHeight(e.endCoordinates.height);
        setShowMascotTooltip(true);
      }
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setShowMascotTooltip(false);
        if (dismissTimer.current) clearTimeout(dismissTimer.current);
      }
    );
    return () => {
      showSub.remove();
      hideSub.remove();
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
    };
  }, []);

  const handleTypingComplete = () => {
    dismissTimer.current = setTimeout(() => setShowMascotTooltip(false), AUTO_DISMISS_MS);
  };

  const handleContinue = () => {
    if (!field.canContinue) return;
    sendOtp.mutate(email.trim().toLowerCase(), {
      onSuccess: () => {
        router.push({
          pathname: '/(auth)/otp',
          params: { name, email, password, username: field.value },
        });
      },
      onError: (error: any) => {
        Alert.alert('Error', error.response?.data?.message || 'Failed to send verification code.');
      },
    });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <OnboardingHeader onBack={() => router.back()} progress={4 / 6} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={styles.body}>
          <Text style={styles.heading}>Create your username</Text>
          <Text style={styles.subtext}>
            This is how people will find and mention you on Paltuu. You can change it later.
          </Text>

          <UsernameField onStateChange={setField} onSubmitEditing={handleContinue} />
        </View>

        <View style={styles.bottom}>
          <PaltuuButton
            label="Continue"
            onPress={handleContinue}
            loading={sendOtp.isPending}
            disabled={!field.canContinue || sendOtp.isPending}
          />
        </View>
      </KeyboardAvoidingView>

      {showMascotTooltip && (
        <View style={[styles.mascotAboveKeyboard, { bottom: keyboardHeight + 8 }]} pointerEvents="none">
          <PawrvezSpeechBubble
            text={MASCOT_TIP}
            mascotSize={56}
            fontSize={10}
            onTypingComplete={handleTypingComplete}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  mascotAboveKeyboard: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  body: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  heading: {
    fontSize: 26,
    fontFamily: 'Montserrat_700Bold',
    color: '#111827',
    marginTop: 10,
    marginBottom: 8,
  },
  subtext: {
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: '#6B7280',
    marginBottom: 32,
    lineHeight: 20,
  },
  bottom: {
    paddingHorizontal: 24,
    paddingBottom: 28,
  },
});
