import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../../../src/stores/authStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { socialApi } from '../../../src/api/social';

// ── Reusable enhanced field ──────────────────────────────────────────────────
function FormField({
  label,
  hint,
  icon,
  prefix,
  multiline = false,
  ...props
}: {
  label: string;
  hint?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  prefix?: string;
  multiline?: boolean;
} & React.ComponentProps<typeof TextInput>) {
  const [focused, setFocused] = useState(false);
  const borderAnim = useRef(new Animated.Value(0)).current;

  const handleFocus = (e: any) => {
    setFocused(true);
    Animated.timing(borderAnim, { toValue: 1, duration: 180, useNativeDriver: false }).start();
    props.onFocus?.(e);
  };
  const handleBlur = (e: any) => {
    setFocused(false);
    Animated.timing(borderAnim, { toValue: 0, duration: 180, useNativeDriver: false }).start();
    props.onBlur?.(e);
  };

  const borderColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#E5E7EB', '#a03048'],
  });
  const shadowOpacity = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.1],
  });

  return (
    <View style={s.fieldContainer}>
      <Text style={[s.fieldLabel, focused && s.fieldLabelFocused]}>{label}</Text>
      <Animated.View
        style={[
          s.fieldWrapper,
          { borderColor, shadowOpacity, shadowColor: '#a03048' },
          focused && s.fieldWrapperFocused,
        ]}
      >
        {icon && (
          <Ionicons name={icon} size={18} color={focused ? '#a03048' : '#9CA3AF'} style={s.fieldIcon} />
        )}
        {prefix && <Text style={[s.prefix, focused && s.prefixFocused]}>{prefix}</Text>}
        <TextInput
          style={[s.fieldInput, multiline && s.fieldInputMulti]}
          placeholderTextColor="#B0B7C3"
          onFocus={handleFocus}
          onBlur={handleBlur}
          multiline={multiline}
          textAlignVertical={multiline ? 'top' : 'center'}
          {...props}
        />
      </Animated.View>
      {hint ? <Text style={s.hint}>{hint}</Text> : null}
    </View>
  );
}

// ────────────────────────────────────────────────────────────────────────────

export default function EditProfileScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const userId = user?.id;

  const { data: profileData } = useQuery({
    queryKey: ['social-profile', userId],
    queryFn: () => socialApi.getProfile(userId!),
    enabled: !!userId,
  });

  const profile = profileData?.profile;

  const [name, setName] = useState(profile?.name || '');
  const [username, setUsername] = useState(profile?.social_username || profile?.username || '');
  const [bio, setBio] = useState(profile?.bio || '');

  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setUsername(profile.social_username || profile.username || '');
      setBio(profile.bio || '');
    }
  }, [profile]);

  const updateMutation = useMutation({
    mutationFn: (payload: any) => socialApi.updateProfile(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social-profile', userId] });
      router.back();
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.message || 'Failed to update profile. Please try again.');
    },
  });

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Name cannot be empty.');
      return;
    }
    updateMutation.mutate({
      name: name.trim(),
      social_username: username.trim().toLowerCase(),
      bio: bio.trim(),
    });
  };

  return (
    <SafeAreaView style={s.root}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        {/* ── Header ── */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.navigate('/(app)/profile')} style={s.headerBtn}>
            <Feather name="x" size={20} color="#374151" />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Edit Profile</Text>
          <TouchableOpacity
            onPress={handleSave}
            disabled={updateMutation.isPending}
            style={s.saveBtn}
          >
            {updateMutation.isPending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={s.saveBtnText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Photo hint card ── */}
          <View style={s.hintCard}>
            <View style={s.hintIconWrap}>
              <LinearGradient colors={['#FAF0F2', '#f3e0e4']} style={s.hintIconBg}>
                <Ionicons name="camera-outline" size={22} color="#a03048" />
              </LinearGradient>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.hintCardTitle}>Change your photo</Text>
              <Text style={s.hintCardSub}>
                Tap your profile or cover photo directly on your profile page to update it.
              </Text>
            </View>
          </View>

          {/* ── Section label ── */}
          <Text style={s.sectionLabel}>Public Info</Text>

          <FormField
            label="Display Name"
            icon="person-outline"
            value={name}
            onChangeText={setName}
            placeholder="Your full name"
            autoCorrect={false}
          />

          <FormField
            label="Username"
            icon="at-outline"
            prefix="@"
            value={username}
            onChangeText={setUsername}
            placeholder="username"
            autoCapitalize="none"
            autoCorrect={false}
            hint="This is how people can find and mention you."
          />

          <FormField
            label="Bio"
            icon="pencil-outline"
            value={bio}
            onChangeText={setBio}
            placeholder="Write a little about yourself or your pets..."
            multiline
            numberOfLines={4}
            maxLength={200}
          />
          {bio.length > 0 && (
            <Text style={s.charCount}>{bio.length}/200</Text>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerBtn: {
    width: 36, height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: 'DMSans_700Bold',
    color: '#111827',
  },
  saveBtn: {
    backgroundColor: '#a03048',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 64,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontFamily: 'DMSans_700Bold',
    fontSize: 14,
  },

  scrollContent: { padding: 20, paddingBottom: 80 },

  // Hint card
  hintCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#FAF9FF',
    borderWidth: 1,
    borderColor: '#EDE9F8',
    borderRadius: 16,
    padding: 14,
    marginBottom: 28,
  },
  hintIconWrap: {
    shadowColor: '#a03048',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },
  hintIconBg: {
    width: 44, height: 44,
    borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  hintCardTitle: {
    fontSize: 13,
    fontFamily: 'DMSans_700Bold',
    color: '#374151',
    marginBottom: 2,
  },
  hintCardSub: {
    fontSize: 11,
    fontFamily: 'Montserrat_400Regular',
    color: '#6B7280',
    lineHeight: 16,
  },

  // Section label
  sectionLabel: {
    fontSize: 11,
    fontFamily: 'Montserrat_700Bold',
    color: '#9CA3AF',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 16,
  },

  // Form field
  fieldContainer: { marginBottom: 20 },
  fieldLabel: {
    fontSize: 11,
    fontFamily: 'Montserrat_600SemiBold',
    color: '#6B7280',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  fieldLabelFocused: { color: '#a03048' },
  fieldWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 14,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
  },
  fieldWrapperFocused: { backgroundColor: '#FFFFFF' },
  fieldIcon: { marginRight: 10 },
  prefix: {
    fontSize: 15,
    fontFamily: 'DMSans_700Bold',
    color: '#9CA3AF',
    marginRight: 2,
  },
  prefixFocused: { color: '#a03048' },
  fieldInput: {
    flex: 1,
    height: 52,
    fontSize: 15,
    fontFamily: 'DMSans_400Regular',
    color: '#111827',
  },
  fieldInputMulti: {
    height: undefined,
    minHeight: 110,
    paddingTop: 14,
    paddingBottom: 14,
  },
  hint: {
    fontSize: 11,
    fontFamily: 'Montserrat_400Regular',
    color: '#9CA3AF',
    marginTop: 5,
    marginLeft: 2,
  },
  charCount: {
    fontSize: 11,
    fontFamily: 'Montserrat_400Regular',
    color: '#9CA3AF',
    textAlign: 'right',
    marginTop: -14,
    marginBottom: 8,
  },
});
