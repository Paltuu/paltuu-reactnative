import React, { useState } from 'react';
import { 
  View, 
  Text, 
  SafeAreaView, 
  TouchableOpacity, 
  KeyboardAvoidingView, 
  Platform,
  ScrollView,
  Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { CustomInput } from '../../components/common/CustomInput';
import { PrimaryButton } from '../../components/common/PrimaryButton';
import { useAuthActions } from '../../hooks/useAuth';

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
        // Navigate to OTP Screen with state using query params
        router.push({
          pathname: '/(auth)/otp',
          params: { name, email, password }
        });
      },
      onError: (error: any) => {
        Alert.alert('Error', error.response?.data?.message || 'Failed to send OTP');
      }
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
          <View className="p-8 pt-12 bg-primary rounded-b-[30px]">
            <Text className="font-heading text-3xl text-white mb-2">Create Account</Text>
            <Text className="font-body text-surfaceSubtle">Join the Paltuu community today</Text>
          </View>

          <View className="p-6 mt-5">
            <CustomInput 
              label="Full Name" 
              value={name}
              onChangeText={setName}
              placeholder="e.g. John Doe"
            />

            <CustomInput 
              label="Email" 
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="e.g. john@example.com"
            />

            <CustomInput 
              label="Password" 
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="Min. 8 characters"
            />

            <View className="mt-4">
              <PrimaryButton 
                title="Send Verification Code" 
                onPress={handleRegisterPress}
                loading={sendOtp.isPending}
              />
            </View>

            <View className="flex-row justify-center mt-8">
              <Text className="font-body text-gray-500 text-sm">Already have an account? </Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
                <Text className="font-bodyMedium text-primary text-sm font-bold">Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
