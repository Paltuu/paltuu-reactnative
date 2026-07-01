import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import PaltuuButton from '../../src/components/ui/PaltuuButton';
import { OnboardingHeader } from '../../src/components/auth/OnboardingHeader';
import { useAuthActions } from '../../src/hooks/useAuth';

const USERNAME_REGEX = /^[a-zA-Z0-9_.]{3,30}$/;

export default function UsernameScreen() {
  const { name, email, password } = useLocalSearchParams<{
    name: string;
    email: string;
    password: string;
  }>();
  const [username, setUsername] = useState('');
  const [forbiddenChars, setForbiddenChars] = useState<string[]>([]);
  const router = useRouter();
  const { sendOtp } = useAuthActions();

  const isValid = USERNAME_REGEX.test(username);

  const handleChange = (text: string) => {
    const lowered = text.toLowerCase();
    const rejected = Array.from(new Set(lowered.match(/[^a-z0-9_.]/g) ?? []));
    setForbiddenChars(rejected);
    setUsername(lowered.replace(/[^a-z0-9_.]/g, ''));
  };

  const handleContinue = () => {
    if (!isValid) {
      Alert.alert(
        'Invalid username',
        'Username must be 3–30 characters and can only contain letters, numbers, underscores, and periods.'
      );
      return;
    }
    sendOtp.mutate(email.trim().toLowerCase(), {
      onSuccess: () => {
        router.push({
          pathname: '/(auth)/otp',
          params: { name, email, password, username },
        });
      },
      onError: (error: any) => {
        Alert.alert('Error', error.response?.data?.message || 'Failed to send verification code.');
      },
    });
  };

  const getHintColor = () => {
    if (forbiddenChars.length > 0) return '#EF4444';
    if (username.length === 0) return '#9CA3AF';
    return isValid ? '#10B981' : '#EF4444';
  };

  const getHintText = () => {
    if (forbiddenChars.length > 0) {
      return `You can't use ${forbiddenChars.join(', ')} in a username`;
    }
    if (username.length === 0) return 'Letters, numbers, underscores and periods only';
    if (isValid) return `@${username} looks good!`;
    return 'Min. 3 characters. Letters, numbers, _ and . only';
  };

  return (
    <SafeAreaView style={styles.safe}>
      <OnboardingHeader onBack={() => router.back()} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={styles.body}>
          <Text style={styles.heading}>Create your username</Text>
          <Text style={styles.subtext}>
            This is how people will find and mention you on Paltuu. You can change it later.
          </Text>

          {/* Input with @ prefix */}
          <View style={styles.inputRow}>
            <View style={styles.prefixBox}>
              <Text style={styles.prefix}>@</Text>
            </View>
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={handleChange}
              placeholder="yourhandle"
              placeholderTextColor="#B0B7C3"
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleContinue}
              maxLength={30}
            />
            {(username.length > 0 || forbiddenChars.length > 0) && (
              <View style={styles.validIcon}>
                <Ionicons
                  name={isValid && forbiddenChars.length === 0 ? 'checkmark-circle' : 'close-circle'}
                  size={20}
                  color={getHintColor()}
                />
              </View>
            )}
          </View>

          {/* Hint */}
          <Text style={[styles.hint, { color: getHintColor() }]}>
            {getHintText()}
          </Text>
        </View>

        <View style={styles.bottom}>
          <PaltuuButton
            label="Continue"
            onPress={handleContinue}
            loading={sendOtp.isPending}
            disabled={!isValid}
          />
        </View>
      </KeyboardAvoidingView>
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
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    backgroundColor: '#FAFAFA',
    overflow: 'hidden',
    marginBottom: 10,
  },
  prefixBox: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: '#F3F4F6',
    borderRightWidth: 1.5,
    borderRightColor: '#E5E7EB',
  },
  prefix: {
    fontSize: 18,
    fontFamily: 'Montserrat_700Bold',
    color: '#a03048',
  },
  input: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: 'DMSans_400Regular',
    color: '#111827',
  },
  validIcon: {
    paddingRight: 14,
  },
  hint: {
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
    lineHeight: 18,
  },
  bottom: {
    paddingHorizontal: 24,
    paddingBottom: 28,
  },
});
