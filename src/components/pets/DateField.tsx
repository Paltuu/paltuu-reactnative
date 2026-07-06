import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ActionSheetModal } from '../ui/bottom-sheet/ActionSheetModal';

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const toYMD = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const formatPretty = (ymd: string) => {
  if (!ymd) return '';
  const [y, m, d] = ymd.split('-').map(Number);
  if (!y || !m || !d) return ymd;
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

interface DateFieldProps {
  value: string;
  onChange: (ymd: string) => void;
  placeholder?: string;
}

/**
 * Signup-styled date field. Opens the same content-sized bottom drawer used by
 * post cards (via ActionSheetModal) and shows an in-app month calendar.
 * Future dates are disabled — the event being reported already happened.
 */
export function DateField({ value, onChange, placeholder = 'Select a date' }: DateFieldProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <TouchableOpacity style={styles.trigger} onPress={() => setOpen(true)} activeOpacity={0.7}>
        <Ionicons
          name="calendar-outline"
          size={20}
          color={value ? '#a03048' : '#B0B7C3'}
          style={{ marginRight: 10 }}
        />
        <Text style={value ? styles.textSelected : styles.placeholder}>
          {value ? formatPretty(value) : placeholder}
        </Text>
        <Ionicons name="chevron-down" size={20} color="#9CA3AF" style={{ marginLeft: 'auto' }} />
      </TouchableOpacity>

      <ActionSheetModal visible={open} onClose={() => setOpen(false)}>
        {(dismiss) => (
          <Calendar
            value={value}
            onSelect={(ymd) => {
              onChange(ymd);
              dismiss();
            }}
          />
        )}
      </ActionSheetModal>
    </>
  );
}

function Calendar({ value, onSelect }: { value: string; onSelect: (ymd: string) => void }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayYMD = toYMD(today);

  const seed = value ? new Date(value) : today;
  const [view, setView] = useState(() => new Date(seed.getFullYear(), seed.getMonth(), 1));

  // Keep the visible month in sync if the selected value changes externally.
  useEffect(() => {
    const s = value ? new Date(value) : today;
    setView(new Date(s.getFullYear(), s.getMonth(), 1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const year = view.getFullYear();
  const month = view.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth();

  // Always render 6 weeks (42 cells) so the sheet height stays constant across
  // months — ActionSheetModal measures the content height only once.
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length < 42) cells.push(null);

  return (
    <View style={styles.calWrap}>
      <View style={styles.calHeader}>
        <TouchableOpacity onPress={() => setView(new Date(year, month - 1, 1))} style={styles.calNavBtn}>
          <Ionicons name="chevron-back" size={20} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.calTitle}>{MONTH_NAMES[month]} {year}</Text>
        <TouchableOpacity
          onPress={() => !isCurrentMonth && setView(new Date(year, month + 1, 1))}
          style={styles.calNavBtn}
          disabled={isCurrentMonth}
        >
          <Ionicons name="chevron-forward" size={20} color={isCurrentMonth ? '#D1D5DB' : '#374151'} />
        </TouchableOpacity>
      </View>

      <View style={styles.calWeekRow}>
        {WEEKDAYS.map((w) => (
          <Text key={w} style={styles.calWeekday}>{w}</Text>
        ))}
      </View>

      <View style={styles.calGrid}>
        {cells.map((d, i) => {
          if (d === null) return <View key={`e${i}`} style={styles.calCell} />;
          const ymd = toYMD(new Date(year, month, d));
          const isFuture = ymd > todayYMD;
          const isSelected = ymd === value;
          const isToday = ymd === todayYMD;
          return (
            <TouchableOpacity
              key={ymd}
              style={styles.calCell}
              disabled={isFuture}
              onPress={() => onSelect(ymd)}
            >
              <View style={[styles.calDay, isSelected && styles.calDaySelected]}>
                <Text
                  style={[
                    styles.calDayText,
                    isToday && !isSelected && styles.calDayTextToday,
                    isSelected && styles.calDayTextSelected,
                    isFuture && styles.calDayTextDisabled,
                  ]}
                >
                  {d}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 54,
    backgroundColor: '#FAFAFA',
  },
  placeholder: {
    fontSize: 16,
    fontFamily: 'DMSans_400Regular',
    color: '#B0B7C3',
  },
  textSelected: {
    fontSize: 16,
    fontFamily: 'DMSans_400Regular',
    color: '#111827',
  },

  calWrap: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  calHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  calNavBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calTitle: {
    fontSize: 16,
    fontFamily: 'DMSans_700Bold',
    color: '#111827',
  },
  calWeekRow: {
    flexDirection: 'row',
    marginTop: 4,
    marginBottom: 6,
  },
  calWeekday: {
    width: `${100 / 7}%`,
    textAlign: 'center',
    fontSize: 12,
    fontFamily: 'Montserrat_600SemiBold',
    color: '#9CA3AF',
  },
  calGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calDay: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calDaySelected: {
    backgroundColor: '#a03048',
  },
  calDayText: {
    fontSize: 15,
    fontFamily: 'DMSans_400Regular',
    color: '#111827',
  },
  calDayTextToday: {
    color: '#a03048',
    fontFamily: 'DMSans_700Bold',
  },
  calDayTextSelected: {
    color: '#FFFFFF',
    fontFamily: 'DMSans_700Bold',
  },
  calDayTextDisabled: {
    color: '#D1D5DB',
  },
});

export default DateField;
