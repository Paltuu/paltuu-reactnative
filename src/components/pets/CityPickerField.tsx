import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import {
  BottomSheetModal,
  BottomSheetView,
  BottomSheetFlatList,
  BottomSheetTextInput,
  BottomSheetBackdrop,
} from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { PickerOption } from './PickerField';

interface CityPickerFieldProps {
  placeholder: string;
  value: string;
  options: PickerOption[];
  onSelect: (value: string) => void;
  icon?: keyof typeof Ionicons.glyphMap;
}

/**
 * Same trigger look as PickerField, but backed by @gorhom/bottom-sheet
 * (the library used for the app's other sheets — comments, save, report)
 * instead of the hand-rolled ActionSheetModal, so a long city list gets
 * proper virtualized scrolling plus a search box to filter it.
 */
export function CityPickerField({ placeholder, value, options, onSelect, icon }: CityPickerFieldProps) {
  const sheetRef = useRef<BottomSheetModal>(null);
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const [query, setQuery] = useState('');
  const selected = options.find((o) => o.value === value);

  const snapPoints = useMemo(() => [Math.min(screenHeight * 0.75, 560)], [screenHeight]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  const renderBackdrop = useCallback(
    (props: any) => <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.5} />,
    [],
  );

  const handleDismiss = useCallback(() => setQuery(''), []);

  return (
    <>
      <TouchableOpacity style={styles.trigger} onPress={() => sheetRef.current?.present()} activeOpacity={0.7}>
        {icon && (
          <Ionicons name={icon} size={20} color={selected ? '#a03048' : '#B0B7C3'} style={{ marginRight: 10 }} />
        )}
        <Text style={selected ? styles.textSelected : styles.placeholder}>
          {selected ? selected.label : placeholder}
        </Text>
        <Ionicons name="chevron-down" size={20} color="#9CA3AF" style={{ marginLeft: 'auto' }} />
      </TouchableOpacity>

      <BottomSheetModal
        ref={sheetRef}
        index={0}
        snapPoints={snapPoints}
        // v5 defaults this to true, which measures content to size the sheet —
        // but a flex:1 BottomSheetFlatList can't be measured that way, so it
        // falls back to expanding past our fixed snapPoints (and past the top
        // safe area) instead of respecting them, and the list never settles
        // into its own scrollable region.
        enableDynamicSizing={false}
        // Without an explicit topInset the sheet doesn't know where the status
        // bar/notch actually ends, so keyboardBehavior="interactive" (default)
        // grows the sheet to stay above the keyboard right past that boundary
        // once the search input is focused.
        topInset={insets.top}
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        onDismiss={handleDismiss}
        backdropComponent={renderBackdrop}
        enablePanDownToClose
        backgroundStyle={{ backgroundColor: '#FFFFFF', borderRadius: 24 }}
        handleIndicatorStyle={{ backgroundColor: '#E5E7EB', width: 40 }}
      >
        <BottomSheetView style={{ flex: 1 }}>
          <Text style={styles.sheetTitle}>{placeholder}</Text>

          <View style={styles.searchRow}>
            <Ionicons name="search" size={18} color="#9CA3AF" />
            <BottomSheetTextInput
              style={styles.searchInput}
              placeholder="Search city…"
              placeholderTextColor="#B0B7C3"
              value={query}
              onChangeText={setQuery}
            />
            {!!query && (
              <TouchableOpacity onPress={() => setQuery('')} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color="#C4C4CC" />
              </TouchableOpacity>
            )}
          </View>

          <BottomSheetFlatList
            style={{ flex: 1 }}
            data={filtered}
            keyExtractor={(item) => item.value}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingHorizontal: 8, paddingBottom: Math.max(insets.bottom, 20) }}
            renderItem={({ item }) => {
              const isSelected = item.value === value;
              return (
                <TouchableOpacity
                  style={[styles.option, isSelected && styles.optionSelected]}
                  onPress={() => {
                    onSelect(item.value);
                    sheetRef.current?.dismiss();
                  }}
                >
                  <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>{item.label}</Text>
                  {isSelected && <Ionicons name="checkmark-circle" size={20} color="#a03048" />}
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                <Text style={{ color: '#9CA3AF', fontFamily: 'DMSans_400Regular', fontSize: 14 }}>No cities found</Text>
              </View>
            }
          />
        </BottomSheetView>
      </BottomSheetModal>
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
  sheetTitle: {
    fontSize: 17,
    fontFamily: 'DMSans_700Bold',
    color: '#111827',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 12,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#F5F5F7',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'DMSans_400Regular',
    color: '#111827',
    padding: 0,
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

export default CityPickerField;
