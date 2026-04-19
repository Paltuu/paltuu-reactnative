import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  TouchableOpacity, 
  KeyboardAvoidingView, 
  Platform,
  ScrollView,
  Alert
} from 'react-native';
import { COLORS } from '../../constants/colors';
import { CustomInput } from '../../components/common/CustomInput';
import { PrimaryButton } from '../../components/common/PrimaryButton';
import { useAuthActions } from '../../hooks/useAuth';

export default function RegisterScreen({ navigation }: any) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { sendOtp } = useAuthActions();

  const handleRegisterPress = () => {
    if (!name || !email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    // Trigger OTP send
    sendOtp.mutate(email.trim().toLowerCase(), {
      onSuccess: () => {
        // Navigate to OTP Screen with state
        navigation.navigate('OTP', {
          name,
          email,
          password
        });
      },
      onError: (error: any) => {
        Alert.alert('Error', error.response?.data?.message || 'Failed to send OTP');
      }
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join the Paltu community today</Text>
          </View>

          <View style={styles.formSection}>
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

            <PrimaryButton 
              title="Send Verification Code" 
              onPress={handleRegisterPress}
              loading={sendOtp.isPending}
            />

            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.linkText}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    padding: 32,
    paddingTop: 48,
    backgroundColor: COLORS.primary,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: 8,
    fontFamily: 'Montserrat_700Bold',
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.primaryLight,
    fontFamily: 'Montserrat_400Regular',
  },
  formSection: {
    padding: 24,
    marginTop: 20,
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
  linkText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
});
