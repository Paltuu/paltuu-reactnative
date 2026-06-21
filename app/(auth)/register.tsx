import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { CustomInput } from '../../src/components/common/CustomInput';
import PaltuuButton from '../../src/components/ui/PaltuuButton';
import { useAuthActions } from '../../src/hooks/useAuth';

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();
  const { sendOtp } = useAuthActions();

  const handleRegisterPress = () => {
    if (!name || !email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    sendOtp.mutate(email.trim().toLowerCase(), {
      onSuccess: () => {
        router.push({
          pathname: '/(auth)/otp',
          params: { name, email, password },
        });
      },
      onError: (error: any) => {
        Alert.alert('Error', error.response?.data?.message || 'Failed to send OTP');
      },
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-surface">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Hero / Branding ── */}
          <View className="bg-primary px-5 pt-8 pb-16 items-center rounded-b-[40px]">
            {/* Decorative blobs */}
            <View
              className="absolute top-4 right-6 w-20 h-20 rounded-full bg-white/10"
              pointerEvents="none"
            />
            <View
              className="absolute bottom-6 left-4 w-12 h-12 rounded-full bg-white/10"
              pointerEvents="none"
            />

            <Image
              source={require('../../assets/icon.png')}
              style={{ width: 140, height: 52 }}
              resizeMode="contain"
            />

            <Text className="font-body text-sm text-white/70 mt-3 tracking-widest uppercase">
              your pet's social home
            </Text>
          </View>

          {/* ── Card that floats over hero ── */}
          <View className="mx-5 -mt-8 bg-surface rounded-2xl p-6 shadow-sm border border-gray-100">
            <Text className="font-heading text-2xl text-dark mb-1">
              Create Account
            </Text>
            <Text className="font-body text-sm text-gray-500 mb-6">
              Join Paltuu and connect with pet lovers near you.
            </Text>

            {/* Inputs */}
            <CustomInput
              label="Full Name"
              value={name}
              onChangeText={setName}
              placeholder="e.g. John Doe"
              leftIcon="person-outline"
            />

            <CustomInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="e.g. john@example.com"
              leftIcon="mail-outline"
            />

            <CustomInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="Min. 8 characters"
              leftIcon="lock-closed-outline"
            />

            {/* CTA */}
            <View className="mt-6">
              <PaltuuButton
                label="Send Verification Code"
                successLabel="Code sent!"
                onPress={handleRegisterPress}
                loading={sendOtp.isPending}
              />
            </View>
          </View>

          {/* ── Footer ── */}
          <View className="flex-row justify-center mt-6">
            <Text className="font-body text-sm text-gray-500">
              Already have an account?{' '}
            </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
              <Text className="font-headingSemi text-sm text-primary">
                Sign In
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
