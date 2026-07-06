import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { formatPetIdentityNumber, formatCardDate, formatCardExpiry } from '../../utils/petId';

const PRIMARY = '#A03048';
const PRIMARY_BORDER = 'rgba(160,48,72,0.25)';
const BLACK = '#111111';
const DASH = '—';

const Wordmark = require('../../../assets/paltuu_bilkul_tight.svg');
const PawWatermark = require('../../../assets/icons/MAIN_PAW.svg');

export interface PetIdCardPet {
  pet_profile_id: number;
  name: string;
  species: string;
  breed?: string | null;
  gender?: string | null;
  date_of_birth?: string | null;
  avatar_url?: string | null;
  owner_name?: string | null;
  created_at: string;
}

// A stacked label + value field, CNIC-style: small primary label above a
// Candy-Beans black entry.
const Field = ({
  label,
  value,
  style,
}: {
  label: string;
  value?: string | null;
  style?: object;
}) => (
  <View style={style}>
    <Text style={s.label}>{label}</Text>
    <Text style={s.value} numberOfLines={1}>{value || DASH}</Text>
  </View>
);

export const PetIdCard = ({
  pet,
  isPlaceholder = false,
  onPress,
}: {
  pet?: PetIdCardPet;
  isPlaceholder?: boolean;
  onPress?: () => void;
}) => {
  const name = isPlaceholder ? "Your Pet's Name" : pet?.name || DASH;
  const parentName = isPlaceholder ? DASH : pet?.owner_name || DASH;
  const genderRaw = isPlaceholder ? '' : pet?.gender || '';
  const gender = genderRaw ? genderRaw.charAt(0).toUpperCase() : DASH;
  const countryOfStay = 'Pakistan';
  const identityNumber = isPlaceholder
    ? DASH
    : (pet ? formatPetIdentityNumber(pet.pet_profile_id) : DASH);
  const dob = isPlaceholder ? DASH : (pet?.date_of_birth ? formatCardDate(pet.date_of_birth) : DASH);
  const issue = isPlaceholder ? DASH : (pet?.created_at ? formatCardDate(pet.created_at) : DASH);
  const expiry = isPlaceholder ? DASH : (pet?.created_at ? formatCardExpiry(pet.created_at) : DASH);

  const body = (
    <View style={s.card}>
      <Image source={PawWatermark} tintColor={PRIMARY} style={s.watermark} contentFit="contain" />

      {/* Header band — wordmark left, card title centered on the card */}
      <View style={s.header}>
        <Text style={s.headerTitle}>Pet Identity Card</Text>
        <Image source={Wordmark} tintColor="#FFFFFF" style={s.wordmark} contentFit="contain" />
      </View>

      {/* Body: all fields in the left column, photo column on the right —
          mirrors the CNIC where nothing runs underneath the photo. */}
      <View style={s.body}>
        <View style={s.fieldsCol}>
          <Field label="Name" value={name} style={s.fieldGap} />
          <Field label="Parent's Name" value={parentName} style={s.fieldGap} />

          {/* Single row split into two vertical stacks — one flex computation
              for the whole pair grid, so the second column's left edge is
              pixel-identical across all three rows (not three independent
              per-row flex calculations that could round differently). Every
              row uses the same explicit fieldGap — no flex/space-between
              distribution, which produced uneven gaps depending on how much
              leftover space each nesting level absorbed. */}
          <View style={s.pairedGrid}>
            <View style={s.colNarrow}>
              <Field label="Gender" value={gender} style={s.fieldGap} />
              <Field label="Identity Number" value={identityNumber} style={s.fieldGap} />
              <Field label="Date of Issue" value={issue} />
            </View>
            <View style={s.colWide}>
              <Field label="Country of Stay" value={countryOfStay} style={s.fieldGap} />
              <Field label="Date of Birth" value={dob} style={s.fieldGap} />
              <Field label="Date of Expiry" value={expiry} />
            </View>
          </View>
        </View>

        <View style={s.photoCol}>
          {isPlaceholder || !pet?.avatar_url ? (
            <View style={s.photoFallback}>
              <Ionicons name="paw" size={30} color={PRIMARY} style={{ opacity: 0.4 }} />
            </View>
          ) : (
            <View style={s.photoFrame}>
              <Image
                source={{ uri: pet.avatar_url }}
                style={StyleSheet.absoluteFillObject}
                contentFit="cover"
              />
            </View>
          )}

          {/* Signature area — what actually goes on the line is TBD */}
          <View style={s.signatureBlock}>
            <View style={s.signatureLine} />
            <Text style={s.signatureCaption}>Holder's Signature</Text>
          </View>
        </View>
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.9} onPress={onPress}>
        {body}
      </TouchableOpacity>
    );
  }
  return body;
};

// Forced 1:1 — the CNIC photo is portrait, but the pet photo is always
// whatever aspect the owner uploaded, so we crop it to a square instead.
const PHOTO_SIZE = 92;

const s = StyleSheet.create({
  card: {
    width: '100%',
    aspectRatio: 1.586,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: PRIMARY_BORDER,
    overflow: 'hidden',
  },
  watermark: {
    position: 'absolute',
    width: 150,
    height: 150,
    bottom: -34,
    right: -30,
    opacity: 0.06,
  },

  // Header band
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PRIMARY,
    paddingHorizontal: 14,
    paddingVertical: 15,
  },
  wordmark: {
    width: 58,
    height: 21,
  },
  // Absolutely spanned so the title centers on the card itself, not on the
  // space left over beside the wordmark.
  headerTitle: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    fontFamily: 'DMSans_700Bold',
    fontSize: 13.5,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },

  // Body
  body: {
    flex: 1,
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 14,
  },
  fieldsCol: {
    flex: 1,
    paddingRight: 10,
    paddingTop: 8,
    paddingBottom: 8,
    justifyContent: 'center',
  },
  photoCol: {
    width: PHOTO_SIZE,
    alignItems: 'flex-end',
  },
  photoFrame: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: PRIMARY_BORDER,
    overflow: 'hidden',
    backgroundColor: '#FDF0F2',
  },
  photoFallback: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: PRIMARY_BORDER,
    backgroundColor: '#FDF0F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  signatureBlock: {
    width: PHOTO_SIZE,
    marginTop: 'auto',
    marginBottom: -4,
    alignItems: 'center',
  },
  signatureLine: {
    alignSelf: 'stretch',
    borderBottomWidth: 1,
    borderBottomColor: BLACK,
    marginBottom: 3,
  },
  signatureCaption: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 7,
    color: BLACK,
    letterSpacing: 0.2,
  },

  // Fields — one consistent gap constant, applied explicitly, rather than
  // flex/space-between (which distributes leftover space unevenly depending
  // on nesting and produced inconsistent gaps between rows).
  fieldGap: {
    marginBottom: 5,
  },
  pairedGrid: {
    flexDirection: 'row',
  },
  colNarrow: {
    flex: 1,
  },
  colWide: {
    flex: 1.15,
    paddingLeft: 18,
  },
  label: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 8,
    color: PRIMARY,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  value: {
    fontFamily: 'CandyBeans',
    fontSize: 13,
    color: BLACK,
    marginTop: 0.5,
  },
});

export default PetIdCard;
