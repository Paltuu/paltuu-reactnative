import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { expressVetApi, ExpressVetQuestionnaireField } from '../../../../src/api/expressVet';
import { useExpressVetDraftStore } from '../../../../src/stores/expressVetDraftStore';
import PaltuuButton from '../../../../src/components/ui/PaltuuButton';
import { useKeyboardVisible } from '../../../../src/hooks/useKeyboardVisible';
import { uploadImageToS3 } from '../../../../src/utils/uploadImage';
import { FONTS } from '../../../../src/constants/typography';

const DARK = '#1A1A2E';
const PRIMARY = '#A03048';
const H_PAD = 20;

function resolveFields(
  schema: Record<string, any> | undefined,
  category: string,
  species: string
): ExpressVetQuestionnaireField[] {
  const categorySchema = schema?.[category];
  if (!categorySchema) return [];
  if (Array.isArray(categorySchema.fields)) return categorySchema.fields;
  return categorySchema[species]?.fields ?? [];
}

export default function ExpressVetQuestionnaireScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const keyboardVisible = useKeyboardVisible();
  const { category, species, sub_service } = useLocalSearchParams<{ category: string; species: string; sub_service?: string }>();
  const setQuestionnaireAnswers = useExpressVetDraftStore((s) => s.setQuestionnaireAnswers);

  const { data: config, isPending } = useQuery({
    queryKey: ['express-vet-config'],
    queryFn: expressVetApi.getConfig,
    staleTime: 1000 * 60 * 30,
  });

  const fields = resolveFields(config?.questionnaires.schema, category, species);
  const [answers, setAnswers] = useState<Record<string, any>>({});

  const setAnswer = (key: string, value: any) => setAnswers((prev) => ({ ...prev, [key]: value }));

  const handleContinue = () => {
    for (const field of fields) {
      if (!field.required) continue;
      const value = answers[field.key];
      const isEmpty =
        value === undefined ||
        value === null ||
        (typeof value === 'string' && value.trim() === '') ||
        (Array.isArray(value) && value.length === 0);
      if (isEmpty) {
        Alert.alert('Missing info', `Please answer: ${field.label}`);
        return;
      }
    }
    setQuestionnaireAnswers(answers);
    router.push({
      pathname: '/(app)/express-vet/[category]/address',
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
          <Text style={styles.title}>A few quick questions</Text>
          <Text style={styles.subtitle}>Helps us match the right provider</Text>
        </View>
      </View>

      {isPending ? (
        <View style={styles.centerFill}>
          <ActivityIndicator color={PRIMARY} />
        </View>
      ) : (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={{ paddingHorizontal: H_PAD, paddingTop: 16, paddingBottom: 24, gap: 20 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {fields.map((field) => (
              <QuestionnaireField key={field.key} field={field} value={answers[field.key]} onChange={(v) => setAnswer(field.key, v)} />
            ))}
          </ScrollView>
          {/* Drops the home-indicator inset while the keyboard is up — see address.tsx. */}
          <View style={[styles.bottom, { paddingBottom: keyboardVisible ? 12 : insets.bottom + 16 }]}>
            <PaltuuButton label="Continue" onPress={handleContinue} radius={26} />
          </View>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

function QuestionnaireField({
  field,
  value,
  onChange,
}: {
  field: ExpressVetQuestionnaireField;
  value: any;
  onChange: (value: any) => void;
}) {
  return (
    <View style={{ gap: 10 }}>
      <Text style={styles.fieldLabel}>
        {field.label}
        {!field.required && <Text style={styles.optionalTag}>  (optional)</Text>}
      </Text>

      {field.type === 'select' && (
        <View style={{ gap: 8 }}>
          {(field.options ?? []).map((option) => {
            const active = value === option;
            return (
              <TouchableOpacity
                key={option}
                activeOpacity={0.8}
                onPress={() => onChange(option)}
                style={[styles.optionCard, active && styles.optionCardActive]}
              >
                <Text style={[styles.optionText, active && styles.optionTextActive]}>{option}</Text>
                <Ionicons
                  name={active ? 'radio-button-on' : 'radio-button-off'}
                  size={20}
                  color={active ? PRIMARY : '#D1D5DB'}
                />
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {field.type === 'multiselect' && (
        <View style={{ gap: 8 }}>
          {(field.options ?? []).map((option) => {
            const selected: string[] = Array.isArray(value) ? value : [];
            const active = selected.includes(option);
            return (
              <TouchableOpacity
                key={option}
                activeOpacity={0.8}
                onPress={() =>
                  onChange(active ? selected.filter((o) => o !== option) : [...selected, option])
                }
                style={[styles.optionCard, active && styles.optionCardActive]}
              >
                <Text style={[styles.optionText, active && styles.optionTextActive]}>{option}</Text>
                <Ionicons
                  name={active ? 'checkbox' : 'square-outline'}
                  size={20}
                  color={active ? PRIMARY : '#D1D5DB'}
                />
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {field.type === 'boolean' && (
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {(['Yes', 'No'] as const).map((label) => {
            const boolValue = label === 'Yes';
            const active = value === boolValue;
            return (
              <TouchableOpacity
                key={label}
                activeOpacity={0.8}
                onPress={() => onChange(boolValue)}
                style={[styles.choicePill, active && styles.choicePillActive]}
              >
                <Text style={[styles.choicePillText, active && styles.choicePillTextActive]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {field.type === 'text' && (
        <TextInput
          style={styles.input}
          value={value ?? ''}
          onChangeText={onChange}
          placeholder={field.placeholder ?? 'Type here…'}
          placeholderTextColor="#B0B7C3"
          multiline
        />
      )}

      {field.type === 'photo' && <PhotoField value={value} onChange={onChange} />}
    </View>
  );
}

/**
 * Photo answer for a `type: 'photo'` questionnaire field. Uploads to S3 immediately on pick
 * (rather than deferring to submit) so the stored answer is a plain URL string — that keeps
 * `questionnaire_answers` JSON uniform, survives the user backing out and returning, and
 * means the submit button never has to wait on a slow upload. The answer value IS the URL;
 * null/absent means no photo, which is what every photo field's `required: false` expects.
 */
function PhotoField({ value, onChange }: { value: any; onChange: (v: any) => void }) {
  const [uploading, setUploading] = useState(false);

  const pick = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'], // videos are rejected by /social/upload — see uploadImage.ts
        quality: 0.7,
      });
      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      setUploading(true);
      // Library photos are frequently HEIC on iOS (the default camera format) — the upload
      // server's sharp build has no HEIC decoder, so it 500s unless we force real JPEG bytes
      // here rather than just relabeling the mime type. Same fix as profile/edit.tsx's avatar upload.
      const jpeg = await manipulateAsync(asset.uri, [], { compress: 0.8, format: SaveFormat.JPEG });
      const url = await uploadImageToS3({
        uri: jpeg.uri,
        name: `photo_${Date.now()}.jpg`,
        type: 'image/jpeg',
      });
      if (!url) throw new Error('No URL returned');
      onChange(url);
    } catch {
      Alert.alert('Upload failed', 'Could not upload that photo. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  if (value) {
    return (
      <View style={styles.photoPreviewWrap}>
        <Image source={{ uri: value }} style={styles.photoPreview} contentFit="cover" />
        <TouchableOpacity style={styles.photoRemove} onPress={() => onChange(null)}>
          <Ionicons name="close-circle" size={24} color="#FF4B4B" />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <TouchableOpacity style={styles.photoPicker} onPress={pick} disabled={uploading} activeOpacity={0.8}>
      {uploading ? (
        <>
          <ActivityIndicator color={PRIMARY} />
          <Text style={styles.photoPickerText}>Uploading…</Text>
        </>
      ) : (
        <>
          <Ionicons name="camera-outline" size={22} color={PRIMARY} />
          <Text style={styles.photoPickerText}>Add a photo</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FAFAFB' },
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center' },

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

  fieldLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: 15,
    color: DARK,
  },
  optionalTag: {
    fontFamily: FONTS.body,
    fontSize: 12,
    color: '#B0B7C3',
  },

  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  optionCardActive: {
    borderColor: PRIMARY,
    backgroundColor: '#FAF0F2',
  },
  optionText: {
    fontFamily: FONTS.body,
    fontSize: 14,
    color: DARK,
    flex: 1,
  },
  optionTextActive: {
    fontFamily: FONTS.bodyBold,
    color: PRIMARY,
  },

  choicePill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  choicePillActive: {
    borderColor: PRIMARY,
    backgroundColor: '#FAF0F2',
  },
  choicePillText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 14,
    color: DARK,
  },
  choicePillTextActive: {
    color: PRIMARY,
  },

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
    minHeight: 48,
  },

  photoPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: PRIMARY,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 18,
    backgroundColor: '#FDF7F8',
  },
  photoPickerText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 13,
    color: PRIMARY,
  },
  photoPreviewWrap: {
    position: 'relative',
    alignSelf: 'flex-start',
  },
  photoPreview: {
    width: 120,
    height: 120,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
  },
  photoRemove: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },

  bottom: {
    paddingHorizontal: H_PAD,
    paddingTop: 8,
  },
});
