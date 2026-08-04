import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ActionSheetModal } from '../ui/bottom-sheet/ActionSheetModal';

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// Matches the chip shown on the polaroid: "14 March 2023".
export const formatPolaroidDate = (ymd?: string | null): string => {
  if (!ymd) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!m) return '';
  const [, y, mo, d] = m;
  const monthName = MONTH_NAMES[Number(mo) - 1];
  if (!monthName) return '';
  // Day is unpadded — "4 March 2023" reads better on a print than "04".
  return `${Number(d)} ${monthName} ${y}`;
};

const daysInMonth = (year: number, month1: number) => new Date(year, month1, 0).getDate();

const MIN_YEAR = 1900;

interface PolaroidDateFieldProps {
  /**
   * Starting value as YYYY-MM-DD, or null when no date is set.
   *
   * Read on mount only. The three boxes are the source of truth afterwards,
   * because a half-typed year has no valid YYYY-MM-DD to round-trip through
   * the parent — `onChange(null)` fires while the user is still typing, and
   * echoing that back would wipe the digits out from under them. Callers that
   * reuse this field for a different photo must remount it with a `key`.
   */
  value: string | null;
  /** Fires with a complete YYYY-MM-DD, or null while the entry is incomplete. */
  onChange: (ymd: string | null) => void;
}

/**
 * Optional "when was this taken" field for a gallery polaroid: three separate
 * inputs for day, month and year.
 *
 * Deliberately NOT the shared `DateField` calendar. That one only steps a
 * month at a time, and these photos are routinely years old — tagging a puppy's
 * first day home five years back would take ~60 taps on the chevron. Typing
 * "14", picking March, typing "2023" is three interactions regardless of how
 * far back the date is.
 *
 * The whole field is optional, but it's all-or-nothing: a DATE column can't
 * store "March 2023" with no day, and the chip renders as "14 March 2023", so
 * a partial entry reports back as null until all three boxes are filled.
 */
export function PolaroidDateField({ value, onChange }: PolaroidDateFieldProps) {
  const parsed = useMemo(() => {
    const m = value ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(value) : null;
    return m
      ? { day: String(Number(m[3])), month: Number(m[2]), year: m[1] }
      : { day: '', month: 0, year: '' };
  }, [value]);

  const [day, setDay] = useState(parsed.day);
  const [month, setMonth] = useState(parsed.month); // 1-12, 0 = unset
  const [year, setYear] = useState(parsed.year);
  const [monthOpen, setMonthOpen] = useState(false);

  const maxYear = new Date().getFullYear();

  // Re-derives the whole value on every keystroke and reports null unless all
  // three parts form a real, non-future date — so a half-typed year like "20"
  // never escapes as 0020-03-14.
  const emit = (d: string, m: number, y: string) => {
    const dayNum = Number(d);
    const yearNum = Number(y);

    if (!d || !m || y.length !== 4 || !dayNum || !yearNum) return onChange(null);
    if (yearNum < MIN_YEAR || yearNum > maxYear) return onChange(null);
    if (dayNum < 1 || dayNum > daysInMonth(yearNum, m)) return onChange(null);

    const ymd = `${y}-${String(m).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    // Future dates are rejected by the API too; catching it here keeps the
    // user from getting a 400 after they've already hit Save.
    const todayYmd = new Date().toISOString().slice(0, 10);
    onChange(ymd > todayYmd ? null : ymd);
  };

  const setAll = (d: string, m: number, y: string) => {
    setDay(d);
    setMonth(m);
    setYear(y);
    emit(d, m, y);
  };

  const isSet = !!day || !!month || !!year;

  return (
    <View style={s.wrap}>
      <View style={s.labelRow}>
        <Ionicons name="calendar-outline" size={14} color="#6B7280" />
        <Text style={s.label}>When was this taken?</Text>
        <Text style={s.optional}>Optional</Text>
        {isSet && (
          <TouchableOpacity onPress={() => setAll('', 0, '')} hitSlop={8}>
            <Text style={s.clear}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={s.row}>
        <TextInput
          style={[s.box, s.dayBox]}
          value={day}
          onChangeText={(t) => setAll(t.replace(/\D/g, '').slice(0, 2), month, year)}
          placeholder="DD"
          placeholderTextColor="#B0B7C3"
          keyboardType="number-pad"
          maxLength={2}
        />

        <TouchableOpacity style={[s.box, s.monthBox]} onPress={() => setMonthOpen(true)} activeOpacity={0.7}>
          <Text style={month ? s.boxText : s.boxPlaceholder} numberOfLines={1}>
            {month ? MONTH_NAMES[month - 1] : 'Month'}
          </Text>
          <Ionicons name="chevron-down" size={16} color="#9CA3AF" />
        </TouchableOpacity>

        <TextInput
          style={[s.box, s.yearBox]}
          value={year}
          onChangeText={(t) => setAll(day, month, t.replace(/\D/g, '').slice(0, 4))}
          placeholder="YYYY"
          placeholderTextColor="#B0B7C3"
          keyboardType="number-pad"
          maxLength={4}
        />
      </View>

      <ActionSheetModal visible={monthOpen} onClose={() => setMonthOpen(false)}>
        {(dismiss) => (
          <ScrollView style={s.monthList} contentContainerStyle={{ paddingBottom: 16 }}>
            {MONTH_NAMES.map((name, i) => (
              <TouchableOpacity
                key={name}
                style={s.monthRow}
                onPress={() => {
                  setAll(day, i + 1, year);
                  dismiss();
                }}
              >
                <Text style={[s.monthRowText, month === i + 1 && s.monthRowTextActive]}>{name}</Text>
                {month === i + 1 && <Ionicons name="checkmark" size={18} color="#a03048" />}
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </ActionSheetModal>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { marginTop: 14 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  label: { fontSize: 13, fontFamily: 'DMSans_500Medium', color: '#6B7280' },
  optional: { fontSize: 11, fontFamily: 'DMSans_400Regular', color: '#9CA3AF' },
  clear: { marginLeft: 'auto', fontSize: 12, fontFamily: 'DMSans_500Medium', color: '#a03048' },
  row: { flexDirection: 'row', gap: 8 },
  box: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    backgroundColor: '#FAFAFA',
    height: 46,
    paddingHorizontal: 12,
    justifyContent: 'center',
    fontSize: 15,
    fontFamily: 'DMSans_400Regular',
    color: '#111827',
  },
  dayBox: { width: 62, textAlign: 'center' },
  monthBox: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 },
  yearBox: { width: 78, textAlign: 'center' },
  boxText: { flex: 1, fontSize: 15, fontFamily: 'DMSans_400Regular', color: '#111827' },
  boxPlaceholder: { flex: 1, fontSize: 15, fontFamily: 'DMSans_400Regular', color: '#B0B7C3' },
  monthList: { maxHeight: 380, paddingHorizontal: 16 },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  monthRowText: { fontSize: 16, fontFamily: 'DMSans_400Regular', color: '#374151' },
  monthRowTextActive: { color: '#a03048', fontFamily: 'DMSans_500Medium' },
});

export default PolaroidDateField;
