// Shared render component for post/comment/reply text — renders @mentions
// and #hashtags as tappable, styled spans in a single pass. Replaces the
// old per-component `stripHtml()` + ad-hoc hashtag-splitting that used to
// live inline in PostCard.tsx.
//
// Reuses `react-native-controlled-mentions`' own `parseValue` parser (the
// same engine the composer uses to highlight mentions while typing) rather
// than hand-rolling a second regex-splitter — registering hashtags as a
// `patternsConfig` entry alongside the '@' mention trigger means both are
// found correctly-interleaved in one pass, with no risk of hashtag/mention
// ordering bugs from running two separate sequential splits.
import React from 'react';
import { Text } from 'react-native';
import type { StyleProp, TextStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { parseValue, isTriggerConfig, replaceTriggerValues } from 'react-native-controlled-mentions';
import type { Config, TriggersConfig, PatternsConfig } from 'react-native-controlled-mentions';

const PRIMARY = '#a03048';

type MentionTriggerName = 'mention';

const triggersConfig: TriggersConfig<MentionTriggerName> = {
    mention: { trigger: '@' },
};

const patternsConfig: PatternsConfig = {
    // Mirrors the hashtag regex already used for tap-navigation in PostCard.tsx.
    hashtag: { pattern: /(#\w+)/g },
};

// `getConfigsArray` isn't part of the package's public export surface, so we
// flatten the two config objects ourselves — there's only ever one of each.
const configs: Config[] = [triggersConfig.mention, patternsConfig.hashtag];

const stripHtml = (s: string) => (s ?? '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();

/**
 * Collapses `{@}[Name](type:id)` mention tokens down to plain "@Name" text
 * and strips legacy HTML. For contexts that need a flat string rather than
 * tappable spans — share-sheet text, compact non-interactive previews
 * (search result cards, profile grid captions), notification bodies, etc.
 * Never leaks raw bracket-encoded mention syntax to the user.
 */
export function mentionsToPlainText(content?: string | null): string {
    if (!content) return '';
    return stripHtml(replaceTriggerValues(content, (m) => `${m.trigger}${m.name}`));
}

export interface MentionTapTarget {
    type: 'user' | 'pet';
    id: number;
    name: string;
}

export function MentionText({
    content,
    textStyle,
    onMentionPress,
    onHashtagPress,
}: {
    content?: string | null;
    textStyle?: StyleProp<TextStyle>;
    onMentionPress?: (mention: MentionTapTarget) => void;
    onHashtagPress?: (tag: string) => void;
}) {
    const router = useRouter();
    const clean = stripHtml(content || '');

    if (!clean) return null;

    const { parts } = parseValue(clean, configs);

    return (
        <Text style={textStyle}>
            {parts.map((part, index) => {
                if (!part.config) {
                    return <Text key={index}>{part.text}</Text>;
                }

                if (isTriggerConfig(part.config) && part.data) {
                    const [type, idStr] = part.data.id.split(':');
                    const id = parseInt(idStr, 10);
                    const valid = !isNaN(id) && (type === 'user' || type === 'pet');

                    return (
                        <Text
                            key={index}
                            style={{ fontWeight: '700', color: PRIMARY }}
                            onPress={
                                valid
                                    ? () => {
                                          if (onMentionPress) {
                                              onMentionPress({ type: type as 'user' | 'pet', id, name: part.data!.name });
                                              return;
                                          }
                                          router.push(
                                              type === 'user' ? `/(app)/profile/${id}` : `/(app)/pet-profile/${id}`
                                          );
                                      }
                                    : undefined
                            }
                        >
                            {part.text}
                        </Text>
                    );
                }

                // Pattern match (hashtag)
                return (
                    <Text
                        key={index}
                        style={{ fontWeight: '700', color: PRIMARY }}
                        onPress={() => {
                            if (onHashtagPress) {
                                onHashtagPress(part.text);
                                return;
                            }
                            router.push(`/(app)/search?q=${encodeURIComponent(part.text)}`);
                        }}
                    >
                        {part.text}
                    </Text>
                );
            })}
        </Text>
    );
}
