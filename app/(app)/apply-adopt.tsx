import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import PaltuuButton from '../../src/components/ui/PaltuuButton';
import { OnboardingHeader } from '../../src/components/auth/OnboardingHeader';
import { PickerField } from '../../src/components/pets/PickerField';
import { usePetStore } from '../../src/stores/petStore';
import { useAuthStore } from '../../src/stores/authStore';
import { petApi } from '../../src/api/pets';
import { withFocusUnmount } from '../../src/components/common/withFocusUnmount';

/* One question per step, mirroring the create-pet / create-lost-found flows. */
const STEPS = [
  { key: 'name', heading: 'What\'s your name?', subtext: 'So the guardian knows who\'s applying.' },
  { key: 'location', heading: 'Where do you live?', subtext: 'Your city and address help the guardian evaluate your application.' },
  { key: 'contact', heading: 'How can they reach you?', subtext: 'We\'ll share this with the pet\'s guardian.' },
  { key: 'household', heading: 'Tell us about your home', subtext: 'Kids and other pets help us understand your household. Optional.' },
  { key: 'checks', heading: 'A couple of quick checks', subtext: 'Help us understand your home environment.' },
  { key: 'routine', heading: 'What\'s the daily routine like?', subtext: 'Where they\'ll sleep and how long they might be alone. Optional.' },
  { key: 'notes', heading: 'Anything else?', subtext: 'Additional details for the guardian. Optional.' },
  { key: 'agreement', heading: 'Before you apply', subtext: 'A quick commitment to your new companion.' },
] as const;

const TOTAL_STEPS = STEPS.length;

function ApplyAdoptScreen() {
  const router = useRouter();
  const { pet_id, pet_name } = useLocalSearchParams<{ pet_id?: string; pet_name?: string }>();
  const cities = usePetStore((state) => state.cities);
  const fetchMetadata = usePetStore((state) => state.fetchMetadata);
  const user = useAuthStore((state) => state.user);

  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    adopter_name: user?.name || '',
    city_id: '',
    contact_number: (user?.phone_number || '').replace(/^\+?92/, ''),
    adopter_address: '',
    age_of_youngest_child: '',
    other_pets_details: '',
    other_pets_neutered: false,
    has_secure_outdoor_area: false,
    pet_sleep_location: '',
    pet_left_alone: '',
    additional_details: '',
    agree_to_terms: false,
  });

  useEffect(() => {
    fetchMetadata().catch(() => {});
  }, []);

  const set = (patch: Partial<typeof formData>) => setFormData((prev) => ({ ...prev, ...patch }));

  const cityOptions = (cities || []).map((c: any) => ({
    label: c.city_name || c.name,
    value: (c.city_id || c.id).toString(),
  }));

  const validateStep = (): boolean => {
    const key = STEPS[step].key;
    switch (key) {
      case 'name':
        if (!formData.adopter_name.trim()) {
          Alert.alert('Required', 'Please add your name.');
          return false;
        }
        return true;
      case 'location':
        if (!formData.city_id) {
          Alert.alert('Required', 'Please select a city.');
          return false;
        }
        if (!formData.adopter_address.trim()) {
          Alert.alert('Required', 'Please add your address or area.');
          return false;
        }
        return true;
      case 'contact':
        if (!formData.contact_number.trim()) {
          Alert.alert('Required', 'Please add a contact number.');
          return false;
        }
        return true;
      case 'agreement':
        if (!formData.agree_to_terms) {
          Alert.alert('Required', 'Please agree to the commitment before applying.');
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (!validateStep()) return;
    if (step < TOTAL_STEPS - 1) {
      setStep((prev) => prev + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep((prev) => prev - 1);
    } else {
      router.back();
    }
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const payload = {
        pet_id: parseInt(pet_id as string),
        ...formData,
        city_id: parseInt(formData.city_id),
        contact_number: formData.contact_number.startsWith('+92')
          ? formData.contact_number
          : `+92${formData.contact_number.replace(/^0/, '')}`,
      };
      await petApi.applyForAdoption(payload);
      setSubmitted(true);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to submit application');
    } finally {
      setIsLoading(false);
    }
  };

  const { heading, subtext, key } = STEPS[step];
  const isLast = step === TOTAL_STEPS - 1;

  if (submitted) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.successBody}>
          <View style={styles.successIcon}>
            <Ionicons name="heart" size={38} color="#a03048" />
          </View>
          <Text style={styles.successTitle}>Application sent</Text>
          <Text style={styles.successText}>
            Thanks for opening your heart to {pet_name || 'this pet'}! The guardian will review your
            application and reach out if it's a match.
          </Text>
        </View>
        <View style={styles.bottom}>
          <PaltuuButton label="Back to Pets" onPress={() => router.replace('/(app)/adopt')} radius={26} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <OnboardingHeader onBack={handleBack} progress={(step + 1) / TOTAL_STEPS} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {!!pet_name && <Text style={styles.petNameTag}>Applying for {pet_name}</Text>}
          <Text style={styles.heading}>{heading}</Text>
          <Text style={styles.subtext}>{subtext}</Text>

          {/* ── Name ── */}
          {key === 'name' && (
            <TextInput
              style={styles.input}
              value={formData.adopter_name}
              onChangeText={(t) => set({ adopter_name: t })}
              placeholder="Your full name"
              placeholderTextColor="#B0B7C3"
              autoFocus
              returnKeyType="next"
              onSubmitEditing={handleNext}
            />
          )}

          {/* ── Location (city + address) ── */}
          {key === 'location' && (
            <View style={{ gap: 16 }}>
              <View>
                <Text style={styles.label}>City *</Text>
                <PickerField
                  placeholder="Select a city"
                  value={formData.city_id}
                  options={cityOptions}
                  onSelect={(v) => set({ city_id: v })}
                  icon="location-outline"
                />
              </View>
              <View>
                <Text style={styles.label}>Address / Area *</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={formData.adopter_address}
                  onChangeText={(t) => set({ adopter_address: t })}
                  placeholder="e.g. DHA Phase 5, near Hill Park"
                  placeholderTextColor="#B0B7C3"
                  multiline
                  textAlignVertical="top"
                />
              </View>
            </View>
          )}

          {/* ── Contact ── */}
          {key === 'contact' && (
            <View style={styles.prefixRow}>
              <Text style={styles.prefix}>+92</Text>
              <TextInput
                style={styles.prefixInput}
                value={formData.contact_number}
                onChangeText={(t) => set({ contact_number: t })}
                placeholder="300 1234567"
                placeholderTextColor="#B0B7C3"
                keyboardType="number-pad"
                maxLength={11}
                autoFocus
                returnKeyType="next"
                onSubmitEditing={handleNext}
              />
            </View>
          )}

          {/* ── Household ── */}
          {key === 'household' && (
            <View style={{ gap: 16 }}>
              <View>
                <Text style={styles.label}>Youngest child's age</Text>
                <TextInput
                  style={styles.input}
                  value={formData.age_of_youngest_child}
                  onChangeText={(t) => set({ age_of_youngest_child: t })}
                  placeholder="e.g. 6"
                  placeholderTextColor="#B0B7C3"
                  keyboardType="number-pad"
                />
              </View>
              <View>
                <Text style={styles.label}>Other pets at home</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={formData.other_pets_details}
                  onChangeText={(t) => set({ other_pets_details: t })}
                  placeholder="e.g. 1 dog, 2 years old"
                  placeholderTextColor="#B0B7C3"
                  multiline
                  textAlignVertical="top"
                />
              </View>
            </View>
          )}

          {/* ── Checks ── */}
          {key === 'checks' && (
            <View style={{ gap: 12 }}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => set({ other_pets_neutered: !formData.other_pets_neutered })}
                style={[styles.checkCard, formData.other_pets_neutered && styles.checkCardActive]}
              >
                <Ionicons
                  name={formData.other_pets_neutered ? 'checkmark-circle' : 'ellipse-outline'}
                  size={22}
                  color={formData.other_pets_neutered ? '#a03048' : '#D1D5DB'}
                />
                <Text style={[styles.checkText, formData.other_pets_neutered && styles.checkTextActive]}>
                  My other pets are neutered/spayed
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => set({ has_secure_outdoor_area: !formData.has_secure_outdoor_area })}
                style={[styles.checkCard, formData.has_secure_outdoor_area && styles.checkCardActive]}
              >
                <Ionicons
                  name={formData.has_secure_outdoor_area ? 'checkmark-circle' : 'ellipse-outline'}
                  size={22}
                  color={formData.has_secure_outdoor_area ? '#a03048' : '#D1D5DB'}
                />
                <Text style={[styles.checkText, formData.has_secure_outdoor_area && styles.checkTextActive]}>
                  I have a secure outdoor area
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── Routine ── */}
          {key === 'routine' && (
            <View style={{ gap: 16 }}>
              <View>
                <Text style={styles.label}>Where will they sleep?</Text>
                <TextInput
                  style={styles.input}
                  value={formData.pet_sleep_location}
                  onChangeText={(t) => set({ pet_sleep_location: t })}
                  placeholder="e.g. Indoors, in the bedroom"
                  placeholderTextColor="#B0B7C3"
                />
              </View>
              <View>
                <Text style={styles.label}>Time left alone</Text>
                <TextInput
                  style={styles.input}
                  value={formData.pet_left_alone}
                  onChangeText={(t) => set({ pet_left_alone: t })}
                  placeholder="e.g. 2-4 hours"
                  placeholderTextColor="#B0B7C3"
                />
              </View>
            </View>
          )}

          {/* ── Notes ── */}
          {key === 'notes' && (
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.additional_details}
              onChangeText={(t) => set({ additional_details: t })}
              placeholder="Anything else the guardian should know?"
              placeholderTextColor="#B0B7C3"
              multiline
              textAlignVertical="top"
              autoFocus
            />
          )}

          {/* ── Agreement ── */}
          {key === 'agreement' && (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => set({ agree_to_terms: !formData.agree_to_terms })}
              style={[styles.agreementCard, formData.agree_to_terms && styles.agreementCardActive]}
            >
              <View style={[styles.checkbox, formData.agree_to_terms && styles.checkboxActive]}>
                {formData.agree_to_terms && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
              </View>
              <Text style={styles.agreementText}>
                I agree to provide a safe environment and never abandon the pet.
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        {/* Bottom CTA */}
        <View style={styles.bottom}>
          <PaltuuButton
            label={isLast ? 'Submit Application' : 'Next'}
            successLabel={isLast ? 'Application sent!' : undefined}
            onPress={handleNext}
            loading={isLoading}
            radius={26}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  body: {
    paddingHorizontal: 24,
    paddingTop: 0,
    paddingBottom: 24,
  },
  petNameTag: {
    fontSize: 12,
    fontFamily: 'Montserrat_700Bold',
    color: '#a03048',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 10,
  },
  heading: {
    fontSize: 26,
    fontFamily: 'Montserrat_700Bold',
    color: '#111827',
    marginTop: 6,
    marginBottom: 8,
  },
  subtext: {
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: '#6B7280',
    marginBottom: 28,
    lineHeight: 20,
  },
  label: {
    fontSize: 12,
    fontFamily: 'Montserrat_600SemiBold',
    color: '#6B7280',
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: 'DMSans_400Regular',
    color: '#111827',
    backgroundColor: '#FAFAFA',
  },
  textArea: {
    height: 100,
    paddingTop: 14,
  },

  // Prefixed contact input
  prefixRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    paddingHorizontal: 16,
    backgroundColor: '#FAFAFA',
  },
  prefix: {
    fontSize: 16,
    fontFamily: 'DMSans_700Bold',
    color: '#6B7280',
    marginRight: 8,
  },
  prefixInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: 'DMSans_400Regular',
    color: '#111827',
  },

  // Checks
  checkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    padding: 16,
    backgroundColor: '#FAFAFA',
  },
  checkCardActive: {
    borderColor: '#a03048',
    backgroundColor: '#FFFFFF',
  },
  checkText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'DMSans_500Medium',
    color: '#6B7280',
  },
  checkTextActive: {
    color: '#111827',
    fontFamily: 'DMSans_700Bold',
  },

  // Agreement
  agreementCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    padding: 18,
    backgroundColor: '#FAFAFA',
  },
  agreementCardActive: {
    borderColor: '#a03048',
    backgroundColor: '#FAF0F2',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxActive: {
    borderColor: '#a03048',
    backgroundColor: '#a03048',
  },
  agreementText: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'DMSans_700Bold',
    color: '#111827',
    lineHeight: 20,
  },

  bottom: {
    paddingHorizontal: 24,
    paddingBottom: 28,
    paddingTop: 8,
  },

  // Success screen
  successBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  successIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#FAF0F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 24,
    fontFamily: 'Montserrat_700Bold',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 12,
  },
  successText: {
    fontSize: 15,
    fontFamily: 'DMSans_400Regular',
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default withFocusUnmount(ApplyAdoptScreen);
