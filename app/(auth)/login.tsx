import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { CustomInput } from '../../src/components/common/CustomInput';
import { PrimaryButton } from '../../src/components/common/PrimaryButton';
import { useAuthActions } from '../../src/hooks/useAuth';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();
  const { login } = useAuthActions();

  const handleLogin = () => {
    login.mutate({
      email: email.trim().toLowerCase(),
      password
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
          {/* Top Branding Section */}
          <View className="bg-primary h-[200px] justify-center items-center rounded-b-[30px]">
            <Image
              source={require('../../assets/icon.png')}
              className="w-[150px] h-[60px]"
              resizeMode="contain"
            />
          </View>

          {/* Form Section */}
          <View className="p-6 -mt-5 bg-bg">
            <Text className="font-heading text-2xl text-dark text-center mb-8">
              Welcome Back!
            </Text>

            <CustomInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="Enter your email"
            />

            <CustomInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="Enter your password"
            />

            <TouchableOpacity
              onPress={() => { }} // Handle forget password
              className="self-end mb-6"
            >
              <Text className="font-bodyMedium text-primary">Forgot Password?</Text>
            </TouchableOpacity>

            <PrimaryButton
              title="Sign In"
              onPress={handleLogin}
              loading={login.isPending}
            />

            <View className="flex-row items-center my-6">
              <View className="flex-1 h-[1px] bg-gray-300" />
              <Text className="font-body mx-3 text-gray-500 text-sm">or continue with</Text>
              <View className="flex-1 h-[1px] bg-gray-300" />
            </View>

            <TouchableOpacity className="h-[52px] border border-gray-300 rounded-button justify-center items-center mb-6">
              <Text className="font-heading text-gray-700">Google</Text>
            </TouchableOpacity>

            <View className="flex-row justify-center mt-3">
              <Text className="font-body text-gray-400 text-sm">Don't have an account? </Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
                <Text className="font-bodyMedium text-primary text-sm font-bold">Create one</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
