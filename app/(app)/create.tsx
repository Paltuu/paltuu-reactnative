import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { withFocusUnmount } from '../../src/components/common/withFocusUnmount';

function CreateListingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const options = [
    {
      id: 'pet',
      title: 'Pet for Adoption',
      description: 'Find a loving home for a pet in need',
      icon: 'paw',
      color: '#a03048',
      route: '/create-pet'
    },
    {
      id: 'social',
      title: 'Social Post',
      description: 'Share a moment with the community',
      icon: 'chatbubble-ellipses',
      color: '#2a9d8f',
      route: '/create-post'
    },
    {
      id: 'lost',
      title: 'Lost & Found',
      description: 'Report a missing pet or a found one',
      icon: 'map-marker-radius',
      color: '#e76f51',
      route: '/create-lost-found'
    }
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top + 70 }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>What would you like to list?</Text>
          <Text style={styles.subtitle}>Choose a category to start your listing process</Text>
        </View>

        <View style={styles.optionsContainer}>
          {options.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={styles.optionCard}
              onPress={() => router.push(option.route as any)}
            >
              <View style={[styles.iconContainer, { backgroundColor: option.color + '15' }]}>
                {option.id === 'lost' ? (
                  <MaterialCommunityIcons name={option.icon as any} size={32} color={option.color} />
                ) : (
                  <Ionicons name={option.icon as any} size={32} color={option.color} />
                )}
              </View>
              <View style={styles.textContainer}>
                <Text style={styles.optionTitle}>{option.title}</Text>
                <Text style={styles.optionDescription}>{option.description}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#CCC" />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity 
          style={styles.cancelButton}
          onPress={() => router.back()}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    padding: 24,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
  },
  optionsContainer: {
    gap: 16,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
    color: '#888',
  },
  cancelButton: {
    marginTop: 40,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    color: '#999',
    fontWeight: '500',
  }
});

export default withFocusUnmount(CreateListingScreen);
