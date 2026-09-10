import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Modal,
  Pressable,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { COLORS } from '../../constants/colors';
import { FONTS } from '../../constants/typography';
import {
  COUNTRY_DIALS,
  parseE164,
  toE164,
  type CountryDial,
} from '../../utils/phone';

export interface InternationalPhoneInputProps {
  /** Current value as an E.164 string ("+923001234567") or "". */
  value: string;
  /** Called with the composed E.164 string, or "" while the number is blank. */
  onChangeValue: (next: string) => void;
  autoFocus?: boolean;
  editable?: boolean;
}

/**
 * Country-code picker + national-number field. Emits a single E.164 string so
 * the backend and the web app keep storing phone numbers in one shape.
 */
export default function InternationalPhoneInput({
  value,
  onChangeValue,
  autoFocus,
  editable = true,
}: InternationalPhoneInputProps) {
  const initial = parseE164(value);
  const [country, setCountry] = useState<CountryDial>(initial.country);
  const [national, setNational] = useState<string>(initial.national);
  const [pickerOpen, setPickerOpen] = useState(false);

  // Re-sync when the parent prefills or resets `value` from the outside.
  useEffect(() => {
    if ((value || '') !== toE164(country, national)) {
      const p = parseE164(value);
      setCountry(p.country);
      setNational(p.national);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const emit = (nextCountry: CountryDial, nextNational: string) => {
    const digits = nextNational.replace(/\D/g, '').slice(0, nextCountry.max);
    setCountry(nextCountry);
    setNational(digits);
    onChangeValue(toE164(nextCountry, digits));
  };

  const selectCountry = (c: CountryDial) => {
    setPickerOpen(false);
    emit(c, national);
  };

  return (
    <View style={styles.row}>
      <TouchableOpacity
        style={styles.countryChip}
        onPress={() => editable && setPickerOpen(true)}
        activeOpacity={0.7}
        disabled={!editable}
      >
        <Text style={styles.flag}>{country.flag}</Text>
        <Text style={styles.prefix}>+{country.dial}</Text>
        <Text style={styles.caret}>▾</Text>
      </TouchableOpacity>

      <TextInput
        style={styles.input}
        value={national}
        onChangeText={(text) => emit(country, text)}
        placeholder={country.example}
        placeholderTextColor={COLORS.textPlaceholder}
        keyboardType="number-pad"
        maxLength={country.max}
        autoFocus={autoFocus}
        editable={editable}
      />

      <Modal
        visible={pickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setPickerOpen(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <Text style={styles.sheetTitle}>Select country</Text>
            <FlatList
              data={COUNTRY_DIALS}
              keyExtractor={(c) => c.iso2}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.countryRow}
                  onPress={() => selectCountry(item)}
                  activeOpacity={0.6}
                >
                  <Text style={styles.rowFlag}>{item.flag}</Text>
                  <Text style={styles.rowName}>{item.name}</Text>
                  <Text style={styles.rowDial}>+{item.dial}</Text>
                </TouchableOpacity>
              )}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
  },
  countryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 10,
    marginRight: 10,
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
    paddingVertical: 12,
  },
  flag: { fontSize: 18, marginRight: 6 },
  prefix: { fontSize: 14, fontFamily: FONTS.bodyBold, color: COLORS.textMuted },
  caret: { fontSize: 12, color: COLORS.textMuted, marginLeft: 4 },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: FONTS.body,
    color: COLORS.textDark,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    paddingBottom: 32,
    maxHeight: '70%',
  },
  sheetTitle: {
    fontSize: 16,
    fontFamily: FONTS.bodyBold,
    color: COLORS.textDark,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  countryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  rowFlag: { fontSize: 20, marginRight: 14 },
  rowName: { flex: 1, fontSize: 15, fontFamily: FONTS.body, color: COLORS.textDark },
  rowDial: { fontSize: 15, fontFamily: FONTS.bodyMedium, color: COLORS.textMuted },
});
