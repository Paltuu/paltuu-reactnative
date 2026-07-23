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
import { useRouter } from 'expo-router';
import PaltuuButton from '../src/components/ui/PaltuuButton';
import { OnboardingHeader } from '../src/components/auth/OnboardingHeader';
import { UsernameField, UsernameFieldState } from '../src/components/auth/UsernameField';
import { PawrvezDialog } from '../src/components/common/mascot';
import client from '../src/api/client';

/**
 * Username step for brand-new Google/Apple sign-ups. Mirrors the email
 * flow's username screen (same field + mascot tip) but the account already
 * exists — this just PATCHes the handle, then hands off to /interests
 * for the second (and final) step.
 */
export default function OAuthUsernameScreen() {
  const router = useRouter();
  const [field, setField] = useState<UsernameFieldState>({ value: '', canContinue: false });
  const [showMascotDialog, setShowMascotDialog] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowMascotDialog(true), 400);
    return () => clearTimeout(timer);
  }, []);

  const handleContinue = async () => {
    if (!field.canContinue || saving) return;
    setSaving(true);
    try {
      await client.patch('/social/profile/update', { social_username: field.value });
      router.replace('/interests?flow=oauth');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to save your username.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <OnboardingHeader />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={styles.body}>
          <Text style={styles.stepTag}>Step 1 of 2</Text>
          <Text style={styles.heading}>One last thing</Text>
          <Text style={styles.subtext}>Pick a username for your Paltuu profile.</Text>

          <UsernameField onStateChange={setField} onSubmitEditing={handleContinue} />
        </View>

        <View style={styles.bottom}>
          <PaltuuButton
            label="Continue"
            onPress={handleContinue}
            loading={saving}
            disabled={!field.canContinue || saving}
            radius={26}
          />
        </View>
      </KeyboardAvoidingView>

      <PawrvezDialog
        visible={showMascotDialog}
        text="This is the name you'll be known by around here — don't worry, you can always come back and change it later."
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
    paddingTop: 24,
  },
  stepTag: {
    fontSize: 12,
    fontFamily: 'Montserrat_600SemiBold',
    color: '#a03048',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  heading: {
    fontSize: 26,
    fontFamily: 'Montserrat_700Bold',
    color: '#111827',
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
