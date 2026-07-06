import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ActionSheetModal } from '../ui/bottom-sheet/ActionSheetModal';

export interface PickerOption {
  label: string;
  value: string;
}

interface PickerFieldProps {
  placeholder: string;
  value: string;
  options: PickerOption[];
  onSelect: (value: string) => void;
  icon?: keyof typeof Ionicons.glyphMap;
}

/**
 * Signup-styled select field that opens the same content-sized bottom drawer
 * used across post cards (repost / actions), via ActionSheetModal.
 */
export function PickerField({ placeholder, value, options, onSelect, icon }: PickerFieldProps) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <>
      <TouchableOpacity style={styles.trigger} onPress={() => setOpen(true)} activeOpacity={0.7}>
        {icon && (
          <Ionicons name={icon} size={20} color={selected ? '#a03048' : '#B0B7C3'} style={{ marginRight: 10 }} />
        )}
        <Text style={selected ? styles.textSelected : styles.placeholder}>
          {selected ? selected.label : placeholder}
        </Text>
        <Ionicons name="chevron-down" size={20} color="#9CA3AF" style={{ marginLeft: 'auto' }} />
      </TouchableOpacity>

      <ActionSheetModal visible={open} onClose={() => setOpen(false)}>
        {(dismiss) => (
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{placeholder}</Text>
            <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
              {options.map((item) => {
                const isSelected = item.value === value;
                return (
                  <TouchableOpacity
                    key={item.value}
                    style={[styles.option, isSelected && styles.optionSelected]}
                    onPress={() => {
                      onSelect(item.value);
                      dismiss();
                    }}
                  >
                    <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                      {item.label}
                    </Text>
                    {isSelected && <Ionicons name="checkmark-circle" size={20} color="#a03048" />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}
      </ActionSheetModal>
    </>
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

  sheet: {
    paddingHorizontal: 8,
    paddingBottom: 12,
  },
  sheetTitle: {
    fontSize: 17,
    fontFamily: 'DMSans_700Bold',
    color: '#111827',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 16,
    borderRadius: 14,
  },
  optionSelected: { backgroundColor: '#FAF0F2' },
  optionText: {
    fontSize: 16,
    fontFamily: 'DMSans_400Regular',
    color: '#374151',
  },
  optionTextSelected: {
    fontFamily: 'DMSans_700Bold',
    color: '#a03048',
  },
});

export default PickerField;
