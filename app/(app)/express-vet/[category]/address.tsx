import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Alert, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../../../src/stores/authStore';
import { useLocationStore } from '../../../../src/stores/locationStore';
import { useExpressVetDraftStore } from '../../../../src/stores/expressVetDraftStore';
import PaltuuButton from '../../../../src/components/ui/PaltuuButton';
import PhoneInput, { isValidPkPhone, normalizeIncomingPhone } from '../../../../src/components/ui/PhoneInput';
import { useKeyboardVisible } from '../../../../src/hooks/useKeyboardVisible';
import { FONTS } from '../../../../src/constants/typography';
import { COLORS } from '../../../../src/constants/colors';

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
  const [phone, setPhone] = useState(contactPhone || normalizeIncomingPhone(user?.phone_number));

  useEffect(() => {
    // Prefill once, if the draft store didn't already have a value from a previous pass through this screen.
    if (!contactPhone && user?.phone_number) {
      setPhone(normalizeIncomingPhone(user.phone_number));
    }
  }, [user?.phone_number]);

  const handleContinue = () => {
    if (!line.trim()) {
      Alert.alert('Required', 'Please enter the visit address.');
      return;
    }
    if (!isValidPkPhone(phone)) {
      Alert.alert('Invalid number', 'Please enter a 10-digit contact number.');
      return;
    }
    setAddress({
      addressLine: line.trim(),
      addressLandmark: landmark.trim(),
      mapsLink: maps.trim(),
      contactPhone: phone,
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
              placeholderTextColor={COLORS.textPlaceholder}
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
              placeholderTextColor={COLORS.textPlaceholder}
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
              placeholderTextColor={COLORS.textPlaceholder}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
          </View>

          <View style={{ gap: 8 }}>
            <Text style={styles.fieldLabel}>Contact number</Text>
            <PhoneInput value={phone} onChangeValue={setPhone} />
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
  title: { fontFamily: FONTS.heading, fontSize: 22, color: COLORS.textDark },
  subtitle: { fontFamily: FONTS.body, fontSize: 12, color: COLORS.textMuted, marginTop: 2 },

  fieldLabel: { fontFamily: FONTS.bodyBold, fontSize: 15, color: COLORS.textDark },
  optionalTag: { fontFamily: FONTS.body, fontSize: 12, color: COLORS.textPlaceholder },

  input: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: FONTS.body,
    color: COLORS.textDark,
    backgroundColor: '#FFFFFF',
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },

  bottom: {
    paddingHorizontal: H_PAD,
    paddingTop: 8,
  },
});
