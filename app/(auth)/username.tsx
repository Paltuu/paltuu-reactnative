import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import PaltuuButton from '../../src/components/ui/PaltuuButton';
import client from '../../src/api/client';

const USERNAME_REGEX = /^[a-zA-Z0-9_.]{3,30}$/;

export default function UsernameScreen() {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const isValid = USERNAME_REGEX.test(username);

  const handleChange = (text: string) => {
    setUsername(text.toLowerCase().replace(/[^a-z0-9_.]/g, ''));
  };

  const handleContinue = async () => {
    if (!isValid) {
      Alert.alert(
        'Invalid username',
        'Username must be 3–30 characters and can only contain letters, numbers, underscores, and periods.'
      );
      return;
    }
    setLoading(true);
    try {
      await client.patch('/social/profile/update', { social_username: username });
      router.replace('/interests');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'That username is already taken.');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    router.replace('/interests');
  };

  const getHintColor = () => {
    if (username.length === 0) return '#9CA3AF';
    return isValid ? '#10B981' : '#EF4444';
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <View style={{ width: 26 }} />
        <TouchableOpacity onPress={handleSkip} style={styles.skipBtn}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

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
            {username.length > 0 && (
              <View style={styles.validIcon}>
                <Ionicons
                  name={isValid ? 'checkmark-circle' : 'close-circle'}
                  size={20}
                  color={getHintColor()}
                />
              </View>
            )}
          </View>

          {/* Hint */}
          <Text style={[styles.hint, { color: getHintColor() }]}>
            {username.length === 0
              ? 'Letters, numbers, underscores and periods only'
              : isValid
              ? `@${username} looks good!`
              : 'Min. 3 characters. Letters, numbers, _ and . only'}
          </Text>
        </View>

        <View style={styles.bottom}>
          <PaltuuButton
            label="Continue"
            onPress={handleContinue}
            loading={loading}
            disabled={!isValid}
          />
          <TouchableOpacity onPress={handleSkip} style={styles.skipFooter}>
            <Text style={styles.skipFooterText}>I'll do this later</Text>
          </TouchableOpacity>
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
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  skipBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  skipText: {
    fontSize: 15,
    fontFamily: 'Montserrat_600SemiBold',
    color: '#6B7280',
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
  skipFooter: {
    alignItems: 'center',
    marginTop: 16,
  },
  skipFooterText: {
    fontSize: 13,
    fontFamily: 'DMSans_400Regular',
    color: '#9CA3AF',
  },
});
