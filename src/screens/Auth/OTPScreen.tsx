import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  KeyboardAvoidingView, 
  Platform,
  Alert
} from 'react-native';
import { COLORS } from '../../constants/colors';
import { CustomInput } from '../../components/common/CustomInput';
import { PrimaryButton } from '../../components/common/PrimaryButton';
import { useAuthActions } from '../../hooks/useAuth';

export default function OTPScreen({ route, navigation }: any) {
  const { name, email, password } = route.params;
  const [otp, setOtp] = useState('');
  const { register } = useAuthActions();

  const handleVerify = () => {
    if (!otp) {
      Alert.alert('Error', 'Please enter the verification code');
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
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, padding: 24, justifyContent: 'center' }}
      >
        <View style={styles.content}>
          <Text style={styles.title}>Verify Email</Text>
          <Text style={styles.subtitle}>
            Enter the 6-digit code sent to{'\n'}
            <Text style={styles.emailText}>{email}</Text>
          </Text>

          <CustomInput 
            label="Verification Code" 
            value={otp}
            onChangeText={setOtp}
            keyboardType="number-pad"
            maxLength={6}
            placeholder="000000"
          />

          <PrimaryButton 
            title="Verify & Create Account" 
            onPress={handleVerify}
            loading={register.isPending}
          />

          <View style={styles.footer}>
            <Text style={styles.footerText}>Didn't receive a code? </Text>
            <Text style={styles.resendText}>Resend Code</Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.black,
    marginBottom: 12,
    fontFamily: 'Montserrat_700Bold',
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.gray[600],
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 24,
    fontFamily: 'Montserrat_400Regular',
  },
  emailText: {
    color: COLORS.primary,
    fontWeight: '600',
    fontFamily: 'Montserrat_600SemiBold',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 32,
  },
  footerText: {
    color: COLORS.gray[600],
    fontSize: 14,
    fontFamily: 'Montserrat_400Regular',
  },
  resendText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
});
