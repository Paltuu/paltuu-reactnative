import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  Alert,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import PaltuuButton from '../../src/components/ui/PaltuuButton';
import { OnboardingHeader } from '../../src/components/auth/OnboardingHeader';
import { UsernameField, UsernameFieldState } from '../../src/components/auth/UsernameField';
import { PawrvezDialog } from '../../src/components/common/mascot';
import { useAuthActions } from '../../src/hooks/useAuth';

const MASCOT_TIP = "This is the name you'll be known by around here — don't worry, you can always come back and change it later.";

export default function UsernameScreen() {
  const { name, email, password } = useLocalSearchParams<{
    name: string;
    email: string;
    password: string;
  }>();

  const [field, setField] = useState<UsernameFieldState>({ value: '', canContinue: false });
  const [showMascotDialog, setShowMascotDialog] = useState(false);
  const router = useRouter();
  const { sendOtp } = useAuthActions();

  // Auto-surface the mascot dialog shortly after arriving on this screen.
  useEffect(() => {
    const timer = setTimeout(() => setShowMascotDialog(true), 400);
    return () => clearTimeout(timer);
  }, []);

  // Falls back to the previous step in the flow if there's no navigation
  // history to pop (e.g. this screen was reached directly rather than by
  // pushing through register → username), instead of a dead "GO_BACK" error.
  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(auth)/register');
    }
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
      <OnboardingHeader onBack={handleBack} progress={4 / 6} />

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
            radius={26}
          />
        </View>
      </KeyboardAvoidingView>

      <PawrvezDialog
        visible={showMascotDialog}
        text={MASCOT_TIP}
        onDismiss={() => setShowMascotDialog(false)}
        actionLabel="Got it"
        onAction={() => setShowMascotDialog(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  body: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 0,
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
