import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Modal, Pressable, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { useRouter, useSegments } from 'expo-router';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { notificationsApi, type Notification } from '../../api/notifications';
import { petsApi } from '../../api/pets';
import { queryClient } from '../../api/queryClient';
import { useAuthStore } from '../../stores/authStore';
import { usePetStore } from '../../stores/petStore';
import { storage } from '../../utils/storage';
import { COLORS } from '../../constants/colors';

/**
 * In-app prompt for adoption applications (PALTU-180).
 *
 * Pet owners get "New adoption application" when someone applies for one of
 * their pets; applicants get one when their application is approved or isn't.
 * Push notifications already cover these, but only for people who allowed push
 * and noticed the banner. This reads the same notification rows the bell does
 * (filter=adoptions, unread), so it also reaches everyone else.
 *
 * Checks when the app opens, returns to the foreground, or gets an adoption
 * push while open. Each notification prompts once on this device (ids kept in
 * storage per account); "View" also marks it read so the bell clears. Several
 * new applications become one prompt, and so do several declined ones.
 * Approvals each get their own.
 *
 * Skipped: notifications older than 14 days, and new applications the owner
 * has already approved or declined (on the web, say). Not shown during sign-in,
 * onboarding, composers and application forms, or to dispatchers. On Adoption
 * requests / My applications the person is already looking at the list, so
 * those notifications count as seen and the list refreshes instead.
 */

const TYPE_NEW = 'adoption_new_application';
const TYPE_APPROVED = 'adoption_application_approved';
const TYPE_REJECTED = 'adoption_application_rejected';
const PROMPT_TYPES = new Set([TYPE_NEW, TYPE_APPROVED, TYPE_REJECTED]);

const MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;
// Lets a launch or a navigation settle before a modal goes up over it.
const SHOW_DELAY_MS = 1200;
// After "View", the next prompt in the queue waits for the screen to open.
const NEXT_DELAY_MS = 700;
// Modal fade-out; iOS can't present it again until the dismissal finishes.
const CLOSE_DELAY_MS = 450;
// AppState 'active' also fires after permission dialogs and the like.
const MIN_CHECK_GAP_MS = 10_000;
const LIST_MAX = 3;

// Root segments where a prompt would be in the way (or, for the composers,
// can't present over the native full-screen modal they open in).
const BLOCKED_ROOT = new Set([
  '(auth)', 'onboarding', 'interests', 'oauth-username', 'oauth2redirect',
  'create-post', 'comment', 'quote',
]);
// Second segment under (app): forms mid-way, and the dispatcher console.
const BLOCKED_APP = new Set([
  'apply-adopt', 'create-pet', 'create-lost-found', 'express-vet-dispatch',
]);

type Kind = 'new' | 'approved' | 'rejected';

interface PromptItem {
  notification: Notification;
  petName?: string;
  imageUrl?: string | null;
}

interface Prompt {
  kind: Kind;
  items: PromptItem[];
}

const kindOf = (type: string): Kind =>
  type === TYPE_NEW ? 'new' : type === TYPE_APPROVED ? 'approved' : 'rejected';

const isSameAccount = (userId: string) => {
  const { isAuthenticated, user } = useAuthStore.getState();
  return isAuthenticated && user?.id === userId;
};

const withStop = (text: string) => (/[.!?]$/.test(text.trim()) ? text.trim() : `${text.trim()}.`);

export function AdoptionUpdatePrompt() {
  const router = useRouter();
  const segments = useSegments() as string[];
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const userId = useAuthStore((s) => s.user?.id);
  const isDispatcher = useAuthStore((s) => s.user?.role === 'dispatcher');

  const [queue, setQueue] = useState<Prompt[]>([]);
  const [visible, setVisible] = useState(false);

  const checking = useRef(false);
  const closing = useRef(false);
  const lastCheck = useRef(0);
  const recheckAfterQueue = useRef(false);
  const queueRef = useRef<Prompt[]>([]);
  queueRef.current = queue;
  // Read inside the async check, which outlives the render it started in.
  const segmentsRef = useRef(segments);
  segmentsRef.current = segments;

  const onScreen = (name: string) => segmentsRef.current[0] === '(app)' && segmentsRef.current[1] === name;
  const isBlocked = () => {
    const [root, child] = segmentsRef.current;
    return !root || BLOCKED_ROOT.has(root) || (root === '(app)' && BLOCKED_APP.has(child));
  };

  const enabled = isAuthenticated && !!userId && !isDispatcher;

  const check = useCallback(async (force = false) => {
    if (!enabled || !userId) return;
    if (checking.current) {
      // A push landed mid-check: the check in flight may have fetched before
      // its notification existed, so look again when it's done.
      if (force) recheckAfterQueue.current = true;
      return;
    }
    if (queueRef.current.length > 0) {
      // Something is already up; look again once it's been dealt with.
      recheckAfterQueue.current = true;
      return;
    }
    if (!force && Date.now() - lastCheck.current < MIN_CHECK_GAP_MS) return;
    if (isBlocked()) return;

    checking.current = true;
    lastCheck.current = Date.now();
    try {
      const [seen, res] = await Promise.all([
        storage.getAdoptionPromptSeen(userId),
        notificationsApi.getNotifications({ filter: 'adoptions', unread_only: true, limit: 20 }),
      ]);
      const seenIds = new Set(seen);
      const fresh = (res?.notifications ?? []).filter(
        (n) =>
          PROMPT_TYPES.has(n.type) &&
          !seenIds.has(n.notification_id) &&
          Date.now() - new Date(n.created_at).getTime() < MAX_AGE_MS
      );
      if (fresh.length === 0) return;

      let prompts = await buildPrompts(fresh, async (dropped) => {
        await storage.addAdoptionPromptSeen(userId, dropped);
      });
      if (prompts.length === 0) return;

      await new Promise((r) => setTimeout(r, SHOW_DELAY_MS));
      // Signed out (or into another account), or moved somewhere it shouldn't
      // show, while waiting.
      if (!isSameAccount(userId) || isBlocked()) return;

      // Already on the list these would send them to (often because they just
      // tapped the push for it): count them as seen, and refresh the list so a
      // just-arrived application shows up in it. Checked after the wait, since
      // a push tap on a cold start navigates during it.
      const onRequests = onScreen('adoption-requests');
      const onMine = onScreen('my-applications');
      const quiet = prompts.filter((p) => (p.kind === 'new' ? onRequests : onMine));
      if (quiet.length) {
        await storage.addAdoptionPromptSeen(userId, quiet.flatMap((p) => p.items.map((i) => i.notification.notification_id)));
        if (onRequests) usePetStore.getState().fetchAdoptionRequests();
        if (onMine) usePetStore.getState().fetchMyApplications();
        prompts = prompts.filter((p) => !quiet.includes(p));
      }
      if (prompts.length === 0) return;

      queueRef.current = prompts;
      setQueue(prompts);
      setVisible(true);
    } catch (e: any) {
      if (__DEV__) console.log('[AdoptionUpdatePrompt] check failed:', e?.message);
    } finally {
      checking.current = false;
      // Nothing went up, but a push arrived mid-check: run it again now.
      // (If a prompt did go up, close() runs it once the queue is empty.)
      if (recheckAfterQueue.current && queueRef.current.length === 0) {
        recheckAfterQueue.current = false;
        setTimeout(() => checkRef.current(true), 0);
      }
    }
  }, [enabled, userId]);
  const checkRef = useRef(check);
  checkRef.current = check;

  // On sign-in / app start, and again when leaving a screen where it can't show
  // (e.g. finishing sign-in), since that's when it was skipped.
  const blocked = isBlocked();
  useEffect(() => {
    if (enabled && !blocked) check(true);
  }, [enabled, blocked, check]);

  // Back to the foreground.
  useEffect(() => {
    if (!enabled) return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') check();
    });
    return () => sub.remove();
  }, [enabled, check]);

  // An adoption push arrived while the app is open (on Android this is the
  // local copy NotificationContext schedules, which carries the same data).
  useEffect(() => {
    if (!enabled) return;
    const sub = Notifications.addNotificationReceivedListener((n) => {
      const type = n.request.content.data?.type;
      if (typeof type === 'string' && PROMPT_TYPES.has(type)) check(true);
    });
    return () => sub.remove();
  }, [enabled, check]);

  // Signed out: drop anything queued for the previous account.
  useEffect(() => {
    if (!enabled) {
      setVisible(false);
      setQueue([]);
    }
  }, [enabled]);

  const current = queue[0];

  const close = useCallback(
    (action: 'view' | 'later') => {
      const prompt = queueRef.current[0];
      if (!prompt || !userId || closing.current) return;
      closing.current = true;
      const ids = prompt.items.map((i) => i.notification.notification_id);
      storage.addAdoptionPromptSeen(userId, ids).catch(() => {});

      if (action === 'view') {
        Promise.all(ids.map((id) => notificationsApi.markRead({ notification_id: id }).catch(() => {})))
          .then(() => {
            queryClient.invalidateQueries({ queryKey: ['unread-count'] });
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
          });
        openTarget(router, prompt);
      }

      // Fade out first, then swap in the next prompt (or unmount), so the
      // closing card never shows the next one's text.
      setVisible(false);
      const rest = queueRef.current.slice(1);
      setTimeout(() => {
        closing.current = false;
        if (!isSameAccount(userId)) {
          // Signed out while it was closing: drop the rest.
          queueRef.current = [];
          setQueue([]);
          return;
        }
        queueRef.current = rest;
        setQueue(rest);
        if (rest.length > 0) {
          setVisible(true);
        } else if (recheckAfterQueue.current) {
          recheckAfterQueue.current = false;
          check(true);
        }
      }, action === 'view' ? NEXT_DELAY_MS : CLOSE_DELAY_MS);
    },
    [userId, router, check]
  );

  if (!current) return null;

  const copy = promptCopy(current);
  const image = current.items.length === 1 ? current.items[0].imageUrl : null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={() => close('later')}
    >
      <View className="flex-1 bg-black/50 justify-center items-center px-8">
        <Animated.View
          entering={ZoomIn.duration(240)}
          className="w-full bg-surface rounded-2xl p-6 items-center"
          accessibilityViewIsModal
        >
          <View className="mb-4">
            {image ? (
              <Image
                source={{ uri: image }}
                style={{ width: 72, height: 72, borderRadius: 16 }}
                contentFit="cover"
                accessibilityIgnoresInvertColors
              />
            ) : (
              <View className={`w-16 h-16 rounded-full items-center justify-center ${copy.iconBg}`}>
                <Ionicons name={copy.icon} size={30} color={copy.iconColor} />
              </View>
            )}
            {image ? (
              <View
                className={`absolute -bottom-2 -right-2 w-7 h-7 rounded-full items-center justify-center border-2 border-white ${copy.iconBg}`}
              >
                <Ionicons name={copy.icon} size={14} color={copy.iconColor} />
              </View>
            ) : null}
          </View>

          <Text className="font-heading text-xl text-dark text-center" accessibilityRole="header">
            {copy.title}
          </Text>

          {copy.lines.length > 0 ? (
            <View className="mt-3 self-stretch gap-2">
              {copy.lines.map((line, i) => (
                <View key={i} className="flex-row items-start gap-2">
                  <Ionicons name={copy.icon} size={14} color={copy.iconColor} style={{ marginTop: 3 }} />
                  <Text className="flex-1 font-body text-sm text-dark leading-5">{line}</Text>
                </View>
              ))}
              {copy.more ? <Text className="font-body text-xs text-gray-500 ml-6">{copy.more}</Text> : null}
            </View>
          ) : null}

          {copy.body ? (
            <Text className="mt-2 font-body text-sm text-gray-500 text-center leading-5">{copy.body}</Text>
          ) : null}

          <Pressable
            onPress={() => close('view')}
            className="mt-6 w-full bg-primary py-3.5 rounded-xl items-center active:opacity-80"
            accessibilityRole="button"
          >
            <Text className="font-headingSemi text-base text-white">{copy.action}</Text>
          </Pressable>
          <Pressable
            onPress={() => close('later')}
            className="mt-2 w-full py-3 items-center"
            accessibilityRole="button"
            hitSlop={8}
          >
            <Text className="font-headingSemi text-base text-gray-500">{copy.dismiss}</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

/**
 * Groups the notifications into prompts (approvals first) and adds the pet's
 * photo and name from the person's application lists. Owners aren't prompted
 * about applications that are already decided or gone; those ids go to
 * `onDropped` so they're not looked at again. If a list can't be loaded, the
 * prompt still shows, just without photos.
 */
async function buildPrompts(
  notifications: Notification[],
  onDropped: (ids: number[]) => Promise<void>
): Promise<Prompt[]> {
  const byKind: Record<Kind, Notification[]> = { new: [], approved: [], rejected: [] };
  notifications.forEach((n) => byKind[kindOf(n.type)].push(n));

  const [ownerList, applicantList] = await Promise.all([
    byKind.new.length
      ? petsApi.getMyAdoptionRequests().then(asList).catch(() => null)
      : Promise.resolve(null),
    byKind.approved.length || byKind.rejected.length
      ? petsApi.getMyApplications().then(asList).catch(() => null)
      : Promise.resolve(null),
  ]);

  const dropped: number[] = [];
  const newItems: PromptItem[] = [];
  for (const n of byKind.new) {
    if (!ownerList) {
      newItems.push({ notification: n });
      continue;
    }
    const app = ownerList.find((a) => a.type !== 'foster' && String(a.adoption_id) === String(n.entity_id));
    const status = String(app?.status || 'pending').toLowerCase();
    if (!app || status !== 'pending') {
      dropped.push(n.notification_id);
      continue;
    }
    newItems.push({ notification: n, petName: app.pet_name, imageUrl: app.image_url });
  }
  if (dropped.length) await onDropped(dropped);

  const applicantItem = (n: Notification): PromptItem => {
    const app = applicantList?.find(
      (a) => a.application_type !== 'foster' && String(a.application_id) === String(n.entity_id)
    );
    return { notification: n, petName: app?.pet_name, imageUrl: app?.image_url };
  };

  const prompts: Prompt[] = byKind.approved.map((n) => ({ kind: 'approved', items: [applicantItem(n)] }));
  if (newItems.length) prompts.push({ kind: 'new', items: newItems });
  if (byKind.rejected.length) prompts.push({ kind: 'rejected', items: byKind.rejected.map(applicantItem) });
  return prompts;
}

function asList(res: any): any[] {
  return Array.isArray(res) ? res : res?.applications || res?.data?.applications || [];
}

interface PromptCopy {
  title: string;
  body?: string;
  lines: string[];
  more?: string;
  action: string;
  dismiss: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBg: string;
}

// The lines are the notification text the server wrote (the same words as the
// push and the bell), e.g. "Ali applied to adopt Bruno".
function promptCopy({ kind, items }: Prompt): PromptCopy {
  const single = items.length === 1;
  const lines = items.slice(0, LIST_MAX).map((i) => withStop(i.notification.body));
  const more = items.length > LIST_MAX ? `and ${items.length - LIST_MAX} more` : undefined;

  if (kind === 'new') {
    return {
      title: single ? 'New adoption application' : `${items.length} new adoption applications`,
      body: single ? `${lines[0]} Have a look, and give them a call if they seem like a good fit.` : undefined,
      lines: single ? [] : lines,
      more,
      action: single ? 'View application' : 'View applications',
      dismiss: 'Later',
      icon: 'paw',
      iconColor: COLORS.primary,
      iconBg: 'bg-primarySoft',
    };
  }

  if (kind === 'approved') {
    const pet = items[0].petName;
    return {
      title: 'Application approved!',
      body: `${withStop(items[0].notification.body)} ${pet ? `${pet}'s owner` : 'The owner'} will contact you on the number you gave.`,
      lines: [],
      action: 'View application',
      dismiss: 'Close',
      icon: 'checkmark-circle',
      iconColor: '#1A7A3C', // tailwind `success`
      iconBg: 'bg-successSoft',
    };
  }

  return {
    title: single ? 'Application update' : `${items.length} application updates`,
    body: single
      ? `${withStop(items[0].notification.body)} Lots of other pets are still looking for a home.`
      : 'Lots of other pets are still looking for a home.',
    lines: single ? [] : lines,
    more: single ? undefined : more,
    action: 'See other pets',
    dismiss: 'OK',
    icon: 'heart',
    iconColor: COLORS.primary,
    iconBg: 'bg-primarySoft',
  };
}

function openTarget(router: ReturnType<typeof useRouter>, { kind, items }: Prompt) {
  const applicationId = items.length === 1 && items[0].notification.entity_id != null
    ? String(items[0].notification.entity_id)
    : undefined;
  const params = applicationId ? { applicationId } : {};
  if (kind === 'new') {
    router.push({ pathname: '/(app)/adoption-requests', params } as any);
  } else if (kind === 'approved') {
    router.push({ pathname: '/(app)/my-applications', params } as any);
  } else {
    router.push('/(app)/adopt' as any);
  }
}

export default AdoptionUpdatePrompt;
