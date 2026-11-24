// Building blocks shared by the adoption screens (My Listings, Adoption
// Requests, My Applications and their detail pages). Flat white cards with a
// hairline border on the #FAFAFB page background, like Vets at Home and the
// other newer screens.
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FONTS } from '../../constants/typography';
import { getInitials } from '../../utils/adoption';
import { ActionSheetModal } from '../ui/bottom-sheet/ActionSheetModal';
import { Skeleton, SkeletonCircle } from '../common/Skeleton';

export type IconName = keyof typeof Ionicons.glyphMap;

export const AC = {
  primary: '#A03048',
  ink: '#1A1A2E',
  muted: '#6B6B76',
  faint: '#B0B7C3',
  page: '#FAFAFB',
  surface: '#FFFFFF',
  cardBorder: '#F0F0F0',
  control: '#E4E4E8',
  divider: '#EEEEF1',
  fill: '#F2F2F2',
  success: '#1A7A3C',
  successSoft: '#E6F2EA',
  warning: '#B45309',
  warningSoft: '#FEF3E2',
  danger: '#C0392B',
  dangerSoft: '#FBEAE8',
};

export const PET_PLACEHOLDER = require('../../../assets/dog-placeholder.webp');

// ---------------------------------------------------------------------------
// Page structure

export function ScreenHeader({
  title,
  subtitle,
  onBack,
  right,
}: {
  title: string;
  subtitle?: string;
  onBack: () => void;
  right?: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[s.header, { paddingTop: insets.top + 8 }]}>
      <TouchableOpacity onPress={onBack} hitSlop={10} accessibilityRole="button" accessibilityLabel="Back">
        <Ionicons name="chevron-back" size={26} color={AC.ink} />
      </TouchableOpacity>
      <View style={s.headerText}>
        <Text style={s.headerTitle} numberOfLines={1} accessibilityRole="header">{title}</Text>
        {subtitle ? <Text style={s.headerSubtitle} numberOfLines={1}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}

/** 40pt white circle for a header action, e.g. "New listing". */
export function HeaderIconButton({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      hitSlop={4}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={s.headerIconButton}
    >
      <Ionicons name={icon} size={24} color={AC.primary} />
    </TouchableOpacity>
  );
}

export function SectionHeader({
  title,
  count,
  action,
  style,
}: {
  title: string;
  count?: number;
  action?: { label: string; onPress: () => void };
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[s.sectionHeader, style]}>
      <Text style={s.sectionTitle} accessibilityRole="header">
        {title}
        {count !== undefined ? <Text style={s.sectionCount}>{`  ${count}`}</Text> : null}
      </Text>
      {action ? (
        <TouchableOpacity onPress={action.onPress} hitSlop={10} accessibilityRole="button">
          <Text style={s.linkText}>{action.label}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export function Card({
  children,
  onPress,
  style,
  accessibilityLabel,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  if (onPress) {
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onPress}
        style={[s.card, style]}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
      >
        {children}
      </TouchableOpacity>
    );
  }
  return <View style={[s.card, style]}>{children}</View>;
}

export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[s.divider, style]} />;
}

export function InfoNote({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[s.note, style]}>
      <Ionicons name="information-circle-outline" size={15} color={AC.muted} style={{ marginTop: 1.5 }} />
      <Text style={s.noteText}>{children}</Text>
    </View>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  action,
  style,
}: {
  icon: IconName;
  title: string;
  body: string;
  action?: { label: string; onPress: () => void; icon?: IconName };
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[s.empty, style]}>
      <View style={s.emptyIcon}>
        <Ionicons name={icon} size={32} color={AC.primary} />
      </View>
      <Text style={s.emptyTitle}>{title}</Text>
      <Text style={s.emptyBody}>{body}</Text>
      {action ? (
        <Button
          label={action.label}
          icon={action.icon}
          onPress={action.onPress}
          height={48}
          style={{ marginTop: 22, alignSelf: 'center' }}
        />
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Controls

type ButtonVariant = 'primary' | 'secondary' | 'neutral';
const BUTTON_COLORS: Record<ButtonVariant, { bg: string; fg: string; border: string }> = {
  primary: { bg: AC.primary, fg: '#FFFFFF', border: AC.primary },
  secondary: { bg: AC.surface, fg: AC.ink, border: AC.control },
  neutral: { bg: AC.fill, fg: AC.ink, border: AC.fill },
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  loading,
  disabled,
  height,
  radius,
  textColor,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  /** 'sm' is the 34pt pill used inside rows ("Relist", "Review"). */
  size?: 'md' | 'sm';
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  height?: number;
  radius?: number;
  textColor?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const c = BUTTON_COLORS[variant];
  const fg = textColor || c.fg;
  const small = size === 'sm';
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!(disabled || loading), busy: !!loading }}
      style={[
        s.button,
        {
          height: height ?? (small ? 34 : 50),
          borderRadius: radius ?? (small ? 10 : 12),
          paddingHorizontal: small ? 14 : 20,
          backgroundColor: c.bg,
          borderColor: c.border,
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} size="small" />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={small ? 16 : 18} color={fg} /> : null}
          <Text style={[s.buttonText, { color: fg }, small && { fontSize: 13 }]} numberOfLines={1}>{label}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

type Tone = 'success' | 'warning' | 'danger' | 'neutral';
export const TONE_COLORS: Record<Tone, { bg: string; fg: string }> = {
  success: { bg: AC.successSoft, fg: AC.success },
  warning: { bg: AC.warningSoft, fg: AC.warning },
  danger: { bg: AC.dangerSoft, fg: AC.danger },
  neutral: { bg: AC.fill, fg: AC.muted },
};

export function Chip({
  tone,
  label,
  icon,
  dot,
  style,
}: {
  tone: Tone;
  label: string;
  icon?: IconName;
  dot?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const c = TONE_COLORS[tone];
  return (
    <View style={[s.chip, { backgroundColor: c.bg }, style]}>
      {dot ? <View style={[s.chipDot, { backgroundColor: c.fg }]} /> : null}
      {icon ? <Ionicons name={icon} size={14} color={c.fg} /> : null}
      <Text style={[s.chipText, { color: c.fg }]}>{label}</Text>
    </View>
  );
}

/** Filter pill: white either way, the selected one outlined in the brand colour. */
export function FilterChip({
  label,
  count,
  selected,
  onPress,
}: {
  label: string;
  count: number;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      accessibilityLabel={`${label}, ${count}`}
      style={[s.filterChip, selected && s.filterChipOn]}
    >
      <Text style={[s.filterChipText, selected && { color: AC.primary }]}>{label}</Text>
      <Text style={[s.filterChipCount, selected && { color: AC.primary, fontFamily: FONTS.bodyBold }]}>{count}</Text>
    </TouchableOpacity>
  );
}

/** Icon row inside a bottom sheet. */
export function SheetRow({
  icon,
  label,
  detail,
  destructive,
  onPress,
}: {
  icon: IconName;
  label: string;
  detail?: string;
  destructive?: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.6}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[s.sheetRow, detail ? { minHeight: 64 } : null]}
    >
      <View style={[s.sheetRowIcon, destructive && { backgroundColor: AC.dangerSoft }]}>
        <Ionicons name={icon} size={20} color={destructive ? AC.danger : AC.ink} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[s.sheetRowLabel, destructive && { color: AC.danger }]}>{label}</Text>
        {detail ? <Text style={s.sheetRowDetail}>{detail}</Text> : null}
      </View>
    </TouchableOpacity>
  );
}

/**
 * Bottom sheet whose rows run their action once the sheet has closed, so an
 * Alert or a navigation they start isn't attached to the closing modal.
 * `choose(action)` closes the sheet and then runs `action`.
 */
export function AdoptionSheet({
  visible,
  onClose,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  children: (choose: (action?: () => void) => void) => React.ReactNode;
}) {
  const pending = useRef<(() => void) | null>(null);
  const insets = useSafeAreaInsets();
  return (
    <ActionSheetModal
      visible={visible}
      onClose={() => {
        onClose();
        const run = pending.current;
        pending.current = null;
        if (run) setTimeout(run, 150);
      }}
    >
      {(dismiss) => (
        <View style={[s.sheetBody, { paddingBottom: Math.max(insets.bottom, 16) + 12 }]}>
          {children((action) => {
            pending.current = action ?? null;
            dismiss();
          })}
        </View>
      )}
    </ActionSheetModal>
  );
}

// ---------------------------------------------------------------------------
// Pictures

/** Applicant photo, or their initials on white when there's no photo. */
export function PersonAvatar({
  name,
  uri,
  size = 44,
  style,
}: {
  name?: string | null;
  uri?: string | null;
  size?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [uri]);
  const showPhoto = !!uri && !failed;
  return (
    <View
      style={[
        s.avatar,
        { width: size, height: size, borderRadius: size / 2 },
        style,
      ]}
    >
      {showPhoto ? (
        <Image
          source={{ uri: uri as string }}
          style={{ width: size, height: size }}
          contentFit="cover"
          transition={150}
          onError={() => setFailed(true)}
        />
      ) : (
        <Text style={{ fontFamily: FONTS.headingSemi, fontSize: Math.round(size * 0.34), color: AC.primary }}>
          {getInitials(name)}
        </Text>
      )}
    </View>
  );
}

/** Overlapping applicant avatars, each with a white ring. */
export function AvatarStack({
  people,
  size = 28,
  max = 3,
}: {
  people: { name?: string | null; uri?: string | null }[];
  size?: number;
  max?: number;
}) {
  const ring = 2;
  return (
    <View style={{ flexDirection: 'row' }}>
      {people.slice(0, max).map((p, i) => (
        <View
          key={`${p.name}-${i}`}
          style={{
            padding: ring,
            borderRadius: size / 2 + ring,
            backgroundColor: AC.surface,
            marginLeft: i === 0 ? 0 : -Math.round(size * 0.3),
          }}
        >
          <PersonAvatar name={p.name} uri={p.uri} size={size} />
        </View>
      ))}
    </View>
  );
}

export function PetPhoto({
  uri,
  size,
  radius = 12,
  style,
}: {
  uri?: string | null;
  size: number;
  radius?: number;
  style?: StyleProp<any>;
}) {
  return (
    <Image
      source={uri ? { uri } : PET_PLACEHOLDER}
      style={[{ width: size, height: size, borderRadius: radius, backgroundColor: AC.fill }, style]}
      contentFit="cover"
      transition={200}
    />
  );
}

// ---------------------------------------------------------------------------
// Rows

/** Compact card: pet photo, title, one line of detail, chevron (or `right`). */
export function RowCard({
  image,
  title,
  subtitle,
  subtitleStyle,
  onPress,
  right,
  style,
}: {
  image?: string | null;
  title: string;
  subtitle?: string;
  subtitleStyle?: StyleProp<TextStyle>;
  onPress?: () => void;
  right?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Card onPress={onPress} style={[s.rowCard, style]} accessibilityLabel={title}>
      <PetPhoto uri={image} size={52} radius={12} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={s.rowTitle} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={[s.rowSubtitle, subtitleStyle]} numberOfLines={1}>{subtitle}</Text> : null}
      </View>
      {right !== undefined ? right : onPress ? <Chevron /> : null}
    </Card>
  );
}

export function Chevron() {
  return <Ionicons name="chevron-forward" size={16} color={AC.faint} />;
}

/** Label/value lines inside one card ("Lives in   DHA Phase 6, Lahore"). */
export function KeyValueCard({ rows }: { rows: { label: string; value?: string | null }[] }) {
  const shown = rows.filter((r) => r.value);
  if (shown.length === 0) return null;
  return (
    <View style={[s.card, { paddingHorizontal: 16, paddingVertical: 4 }]}>
      {shown.map((r, i) => (
        <View key={r.label} style={[s.kvRow, i < shown.length - 1 && s.kvRowBorder]}>
          <Text style={s.kvLabel}>{r.label}</Text>
          <Text style={s.kvValue}>{r.value}</Text>
        </View>
      ))}
    </View>
  );
}

/** Three-step tracker under an application: Sent → In review → Decision. */
export function StepProgress({
  labels,
  current,
  color,
}: {
  labels: string[];
  current: number;
  color: string;
}) {
  return (
    <View
      style={{ marginTop: 14 }}
      accessible
      accessibilityLabel={`Step ${current + 1} of ${labels.length}: ${labels[current]}`}
    >
      <View style={{ flexDirection: 'row', gap: 4 }}>
        {labels.map((label, i) => (
          <View key={label} style={[s.stepBar, { backgroundColor: i <= current ? color : AC.control }]} />
        ))}
      </View>
      <View style={{ flexDirection: 'row', marginTop: 6 }}>
        {labels.map((label, i) => (
          <Text
            key={label}
            style={[
              s.stepLabel,
              { textAlign: i === 0 ? 'left' : i === labels.length - 1 ? 'right' : 'center' },
              i === current && s.stepLabelOn,
            ]}
          >
            {label}
          </Text>
        ))}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Loading

export function ListSkeleton() {
  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 22, gap: 16 }} accessibilityLabel="Loading">
      <Skeleton width={120} height={16} borderRadius={6} />
      {[0, 1].map((i) => (
        <View key={i} style={[s.card, { overflow: 'hidden' }]}>
          <Skeleton height={180} borderRadius={0} />
          <View style={{ padding: 16, gap: 10 }}>
            <Skeleton width="45%" height={18} />
            <Skeleton width="70%" height={13} />
          </View>
        </View>
      ))}
    </View>
  );
}

export function RowsSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 22, gap: 12 }} accessibilityLabel="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} style={[s.card, { padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
          <SkeletonCircle size={44} />
          <View style={{ flex: 1, gap: 8 }}>
            <Skeleton width="50%" height={15} />
            <Skeleton width="35%" height={12} />
          </View>
        </View>
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------

export const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: AC.page },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: AC.page,
    borderBottomWidth: 1,
    borderBottomColor: AC.cardBorder,
  },
  headerText: { flex: 1, minWidth: 0 },
  headerTitle: { fontFamily: FONTS.heading, fontSize: 26, color: AC.ink, letterSpacing: -0.5 },
  headerSubtitle: { fontFamily: FONTS.body, fontSize: 13, color: AC.muted, marginTop: 2 },
  headerIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: AC.surface,
    borderWidth: 1,
    borderColor: AC.control,
    alignItems: 'center',
    justifyContent: 'center',
  },

  section: { marginTop: 28, paddingHorizontal: 20 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    minHeight: 22,
  },
  sectionTitle: { fontFamily: FONTS.heading, fontSize: 16, lineHeight: 22, color: AC.ink, letterSpacing: -0.2 },
  sectionCount: { fontFamily: FONTS.bodyMedium, fontSize: 14, color: AC.muted, letterSpacing: 0 },
  linkText: { fontFamily: FONTS.bodyBold, fontSize: 14, color: AC.primary },

  card: {
    backgroundColor: AC.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: AC.cardBorder,
  },
  divider: { height: 1, backgroundColor: AC.divider },

  note: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 12, marginHorizontal: 4 },
  noteText: { flex: 1, fontFamily: FONTS.body, fontSize: 13, lineHeight: 18, color: AC.muted },

  empty: { alignItems: 'center', paddingHorizontal: 40, paddingTop: 72, paddingBottom: 40 },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: AC.surface,
    borderWidth: 1,
    borderColor: AC.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    marginTop: 18,
    fontFamily: FONTS.heading,
    fontSize: 20,
    lineHeight: 26,
    color: AC.ink,
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  emptyBody: {
    marginTop: 8,
    fontFamily: FONTS.body,
    fontSize: 14,
    lineHeight: 21,
    color: AC.muted,
    textAlign: 'center',
  },

  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
  },
  buttonText: { fontFamily: FONTS.headingSemi, fontSize: 15 },

  chip: {
    alignSelf: 'flex-start',
    height: 28,
    paddingHorizontal: 10,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  chipDot: { width: 7, height: 7, borderRadius: 4 },
  chipText: { fontFamily: FONTS.bodyBold, fontSize: 12 },

  filterChip: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: AC.control,
    backgroundColor: AC.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  filterChipOn: { borderColor: AC.primary },
  filterChipText: { fontFamily: FONTS.headingSemi, fontSize: 13, color: AC.ink },
  filterChipCount: { fontFamily: FONTS.bodyMedium, fontSize: 13, color: AC.muted },

  sheetBody: { paddingHorizontal: 20, paddingTop: 4 },
  sheetRow: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 14 },
  sheetRowIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: AC.fill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetRowLabel: { fontFamily: FONTS.bodyMedium, fontSize: 16, lineHeight: 22, color: AC.ink },
  sheetRowDetail: { fontFamily: FONTS.body, fontSize: 13, lineHeight: 18, color: AC.muted },

  avatar: {
    backgroundColor: AC.surface,
    borderWidth: 1,
    borderColor: AC.control,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },

  rowCard: {
    borderRadius: 18,
    paddingVertical: 12,
    paddingLeft: 12,
    paddingRight: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  rowTitle: { fontFamily: FONTS.bodyBold, fontSize: 15, lineHeight: 20, color: AC.ink },
  rowSubtitle: { fontFamily: FONTS.body, fontSize: 13, lineHeight: 18, color: AC.muted },

  kvRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 16, paddingVertical: 13 },
  kvRowBorder: { borderBottomWidth: 1, borderBottomColor: AC.divider },
  kvLabel: { fontFamily: FONTS.body, fontSize: 14, lineHeight: 20, color: AC.muted },
  kvValue: { flex: 1, fontFamily: FONTS.bodyBold, fontSize: 14, lineHeight: 20, color: AC.ink, textAlign: 'right' },

  stepBar: { flex: 1, height: 4, borderRadius: 2 },
  stepLabel: { flex: 1, fontFamily: FONTS.body, fontSize: 12, lineHeight: 16, color: AC.muted },
  stepLabelOn: { fontFamily: FONTS.bodyBold, color: AC.ink },
});
