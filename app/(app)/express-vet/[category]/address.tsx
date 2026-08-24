import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Alert, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../../../src/stores/authStore';
import { useLocationStore } from '../../../../src/stores/locationStore';
import { useExpressVetDraftStore } from '../../../../src/stores/expressVetDraftStore';
import PaltuuButton from '../../../../src/components/ui/PaltuuButton';
import { useKeyboardVisible } from '../../../../src/hooks/useKeyboardVisible';
import { FONTS } from '../../../../src/constants/typography';

const DARK = '#1A1A2E';
const H_PAD = 20;

export default function ExpressVetAddressScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const keyboardVisible = useKeyboardVisible();
  const { category, species, sub_service } = useLocalSearchParams<{ category: string; species: string; sub_service?: string }>();
  const user = useAuthStore((s) => s.user);
  const { addressLine, addressLandmark, mapsLink, contactPhone, setAddress } = useExpressVetDraftStore();

  const [line, setLine] = useState(addressLine);
  const [landmark, setLandmark] = useState(addressLandmark);
  const [maps, setMaps] = useState(mapsLink);
  const [phone, setPhone] = useState(contactPhone || (user?.phone_number ?? '').replace(/^\+?92/, '').replace(/^0/, ''));

  useEffect(() => {
    // Prefill once, if the draft store didn't already have a value from a previous pass through this screen.
    if (!contactPhone && user?.phone_number) {
      setPhone(user.phone_number.replace(/^\+?92/, '').replace(/^0/, ''));
    }
  }, [user?.phone_number]);

  const handleContinue = () => {
    if (!line.trim()) {
      Alert.alert('Required', 'Please enter the visit address.');
      return;
    }
    if (phone.length !== 10) {
      Alert.alert('Invalid number', 'Please enter a 10-digit contact number (e.g. 3001234567).');
      return;
    }
    setAddress({
      addressLine: line.trim(),
      addressLandmark: landmark.trim(),
      mapsLink: maps.trim(),
      contactPhone: `+92${phone.replace(/^0/, '')}`,
    });
    router.push({
      pathname: '/(app)/express-vet/[category]/review-and-submit',
      params: { category, species, sub_service },
    } as any);
  };

  return (
    <View style={styles.root}>
      <View style={[styles.topBar, { paddingHorizontal: H_PAD, paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(app)/pets'))}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={26} color="#111827" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Visit address</Text>
          <Text style={styles.subtitle}>Where should the provider come?</Text>
        </View>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: H_PAD, paddingTop: 16, paddingBottom: 24, gap: 18 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={{ gap: 8 }}>
            <Text style={styles.fieldLabel}>Address</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={line}
              onChangeText={setLine}
              placeholder="House/flat number, street, area…"
              placeholderTextColor="#B0B7C3"
              multiline
              autoFocus
            />
          </View>

          <View style={{ gap: 8 }}>
            <Text style={styles.fieldLabel}>
              Landmark <Text style={styles.optionalTag}>(optional)</Text>
            </Text>
            <TextInput
              style={styles.input}
              value={landmark}
              onChangeText={setLandmark}
              placeholder="e.g. Near Hill Park, DHA"
              placeholderTextColor="#B0B7C3"
            />
          </View>

          <View style={{ gap: 8 }}>
            <Text style={styles.fieldLabel}>
              Google Maps link <Text style={styles.optionalTag}>(optional)</Text>
            </Text>
            <TextInput
              style={styles.input}
              value={maps}
              onChangeText={setMaps}
              placeholder="Paste a Google Maps link to your location"
              placeholderTextColor="#B0B7C3"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
          </View>

          <View style={{ gap: 8 }}>
            <Text style={styles.fieldLabel}>Contact number</Text>
            <View style={styles.prefixRow}>
              <Text style={styles.prefix}>+92</Text>
              <TextInput
                style={styles.prefixInput}
                value={phone}
                onChangeText={(text) => setPhone(text.replace(/\D/g, '').slice(0, 10))}
                placeholder="3001234567"
                placeholderTextColor="#B0B7C3"
                keyboardType="number-pad"
                maxLength={10}
              />
            </View>
          </View>
        </ScrollView>

        {/* With the keyboard up, KeyboardAvoidingView has already lifted this clear of it —
            still adding the home-indicator inset on top is what leaves a dead gap between
            the button and the keyboard. Same fix as create-pet.tsx's bottom CTA. */}
        <View style={[styles.bottom, { paddingBottom: keyboardVisible ? 12 : insets.bottom + 16 }]}>
          <PaltuuButton label="Continue" onPress={handleContinue} radius={26} />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FAFAFB' },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 16,
    backgroundColor: '#FAFAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  title: { fontFamily: FONTS.heading, fontSize: 22, color: DARK },
  subtitle: { fontFamily: FONTS.body, fontSize: 12, color: '#8A8A94', marginTop: 2 },

  fieldLabel: { fontFamily: FONTS.bodyBold, fontSize: 15, color: DARK },
  optionalTag: { fontFamily: FONTS.body, fontSize: 12, color: '#B0B7C3' },

  input: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: FONTS.body,
    color: DARK,
    backgroundColor: '#FFFFFF',
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },

  prefixRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
  },
  prefix: {
    fontSize: 14,
    fontFamily: FONTS.bodyBold,
    color: '#6B7280',
    marginRight: 8,
  },
  prefixInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: FONTS.body,
    color: DARK,
  },

  bottom: {
    paddingHorizontal: H_PAD,
    paddingTop: 8,
  },
});
