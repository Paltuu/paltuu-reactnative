import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FONTS } from '../../constants/typography';

const PRIMARY = '#A03048';
const DARK = '#1A1A2E';

type TabKey = 'visit' | 'emergency' | 'vaccination';

interface ResourceItem {
  title: string;
  body: string;
}

const CONTENT: Record<TabKey, ResourceItem[]> = {
  visit: [
    {
      title: 'Medical Records',
      body: 'Bring files of past checkups, surgery histories, and a list of any current medications your pet takes.',
    },
    {
      title: 'Symptom Checklist',
      body: 'Note down changes in appetite, behavior, lethargy, or breathing to share clearly with the doctor.',
    },
    {
      title: 'Secure Carrier / Leash',
      body: 'Keep dogs secure on a short leash and transport cats inside a sturdy carrier to prevent vet-waiting stress.',
    },
    {
      title: 'Comfort Treats',
      body: 'Bring small pieces of their absolute favorite treats to build positive associations with clinical environments.',
    },
  ],
  emergency: [
    {
      title: 'Difficulty Breathing',
      body: 'Rapid, laboured, or open-mouthed breathing in cats needs immediate attention — call ahead before arriving.',
    },
    {
      title: 'Persistent Vomiting / Diarrhea',
      body: 'Repeated episodes, especially with blood or lethargy, can cause dangerous dehydration quickly.',
    },
    {
      title: 'Sudden Collapse or Seizures',
      body: 'Fainting, unresponsiveness, or seizure activity is always an emergency — keep the pet warm and calm.',
    },
    {
      title: 'Trauma or Bleeding',
      body: 'Road accidents, deep wounds, or uncontrolled bleeding require urgent professional care.',
    },
  ],
  vaccination: [
    {
      title: 'Puppies (6–16 weeks)',
      body: 'Core DHPP series every 3–4 weeks, plus the first rabies shot around 12 weeks of age.',
    },
    {
      title: 'Kittens (6–16 weeks)',
      body: 'FVRCP series every 3–4 weeks, with rabies given from 12 weeks onward.',
    },
    {
      title: 'Annual Boosters',
      body: 'Adult dogs and cats need yearly boosters to maintain immunity against core diseases.',
    },
    {
      title: 'Deworming & Parasites',
      body: 'Pair vaccinations with routine deworming and flea/tick prevention for full protection.',
    },
  ],
};

const TABS: { key: TabKey; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'visit', label: 'Visit Preparation', icon: 'checkmark-circle-outline' },
  { key: 'emergency', label: 'Emergency Signs', icon: 'medkit-outline' },
  { key: 'vaccination', label: 'Vaccination Guide', icon: 'calendar-outline' },
];

export const ClinicResources = () => {
  const [tab, setTab] = useState<TabKey>('visit');
  const items = CONTENT[tab];

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Helpful Pet Care Resources</Text>
      <Text style={styles.subtitle}>
        Prepare for your next clinic visit or check crucial health milestones.
      </Text>

      {/* Tabs */}
      <View style={styles.tabRow}>
        {TABS.map((t) => {
          const active = t.key === tab;
          return (
            <TouchableOpacity
              key={t.key}
              onPress={() => setTab(t.key)}
              activeOpacity={0.85}
              style={[styles.tab, active && styles.tabActive]}
            >
              <Ionicons
                name={t.icon}
                size={13}
                color={active ? '#FFF' : PRIMARY}
              />
              <Text style={[styles.tabText, active && styles.tabTextActive]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Resource list */}
      <View style={styles.list}>
        {items.map((item) => (
          <View key={item.title} style={styles.item}>
            <Text style={styles.itemTitle}>{item.title}</Text>
            <Text style={styles.itemBody}>{item.body}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#F0F0F2',
  },
  title: { fontFamily: FONTS.heading, fontSize: 16, color: DARK },
  subtitle: { fontFamily: FONTS.body, fontSize: 12.5, color: '#8A8A94', marginTop: 4 },
  tabRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 999,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#F0DCE1',
  },
  tabActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  tabText: { fontFamily: FONTS.bodyBold, fontSize: 11.5, color: PRIMARY },
  tabTextActive: { color: '#FFF' },
  list: {
    marginTop: 16,
    gap: 10,
  },
  item: {
    backgroundColor: '#FAFAFB',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F0F0F2',
  },
  itemTitle: { fontFamily: FONTS.headingSemi, fontSize: 13.5, color: DARK, marginBottom: 5 },
  itemBody: { fontFamily: FONTS.body, fontSize: 12.5, color: '#6B7280', lineHeight: 19 },
});
