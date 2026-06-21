import React, { useState } from 'react';
import { 
  View, 
  Text, 
  KeyboardAvoidingView, 
  Platform,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { CustomInput } from '../../src/components/common/CustomInput';
import PaltuuButton from '../../src/components/ui/PaltuuButton';
import { useAuthActions } from '../../src/hooks/useAuth';

export default function OTPScreen() {
  const { name, email, password } = useLocalSearchParams<{ name: string; email: string; password?: string }>();
  const [otp, setOtp] = useState('');
  const { register } = useAuthActions();

  const handleVerify = () => {
    if (!otp) {
      Alert.alert('Error', 'Please enter the verification code');
      return;
    }

    if (!name || !email || !password) {
      Alert.alert('Error', 'Missing registration details. Please go back and try again.');
      return;
    }

    register.mutate({
      name,
      email: email.trim().toLowerCase(),
      password,
      otp
    }, {
      onError: (error: any) => {
        Alert.alert('Error', error.response?.data?.message || 'Verification failed');
      }
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1 p-6 justify-center"
      >
        <View className="items-center">
          <Text className="font-heading text-3xl text-dark mb-3">Verify Email</Text>
          <Text className="font-body text-gray-500 text-center mb-10 leading-6">
            Enter the 6-digit code sent to{'\n'}
            <Text className="text-primary font-headingSemi">{email}</Text>
          </Text>

          <View className="w-full">
            <CustomInput 
              label="Verification Code" 
              value={otp}
              onChangeText={setOtp}
              keyboardType="number-pad"
              maxLength={6}
              placeholder="000000"
            />

            <PaltuuButton
              label="Verify & Create Account"
              successLabel="Welcome to Paltuu!"
              onPress={handleVerify}
              loading={register.isPending}
            />
          </View>

          <View className="flex-row justify-center mt-8">
            <Text className="font-body text-gray-500 text-sm">Didn't receive a code? </Text>
            <Text className="text-primary font-heading text-sm">Resend Code</Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
