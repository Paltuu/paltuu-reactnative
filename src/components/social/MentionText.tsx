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
import React, { useMemo, useState } from 'react';
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

// Must match REDACTED_WORD_MARKER in paltuu-nextjs/petproj/lib/moderation/badWords.ts
// exactly — Private-Use-Area sentinels wrapping the word a 'redacted'
// post/comment had covered server-side (see lib/moderationRedaction.ts).
// The real slur is never sent to the client for a redacted item; this is
// just a marker telling us where to draw the grey chip.
const REDACTED_MARKER = 'REDACTED';

const patternsConfig: PatternsConfig = {
    // Mirrors the hashtag regex already used for tap-navigation in PostCard.tsx.
    hashtag: { pattern: /(#\w+)/g },
    redacted: { pattern: /(REDACTED)/g },
};

// `getConfigsArray` isn't part of the package's public export surface, so we
// flatten the two config objects ourselves — there's only ever one of each.
const configs: Config[] = [triggersConfig.mention, patternsConfig.hashtag, patternsConfig.redacted];

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

// ── Collapsing long bodies ───────────────────────────────────────────────────
// Feed captions can run to several screens (see the Twitter-style "Show more"
// on PostCard). Truncation is by character budget rather than by measured
// line count on purpose: an onTextLayout-based clamp needs a render pass to
// find out whether it truncated, which means a second layout on every long
// caption in a recycling list. A character budget is decided before the first
// paint, so a cell's height is stable the moment it mounts.
//
// Only whole parts are kept or dropped, except the plain-text part the budget
// happens to land in — a mention/hashtag is never cut in half, so the encoded
// `{@}[Name](type:id)` token can't leak out as raw text mid-word.

/** Don't collapse for a handful of characters — the tap wouldn't be worth it. */
const COLLAPSE_SLACK = 48;

type TextPart = ReturnType<typeof parseValue>['parts'][number];

/** Drops trailing whitespace from the last kept part, so the ellipsis that
 *  follows a cut sits flush against the text rather than off a stray space. */
function trimTail(parts: TextPart[]): TextPart[] {
    const last = parts[parts.length - 1];
    if (!last || last.config) return parts;
    return [...parts.slice(0, -1), { ...last, text: last.text.replace(/\s+$/, '') }];
}

function truncateParts(parts: TextPart[], budget: number): { parts: TextPart[]; truncated: boolean } {
    let used = 0;
    const kept: TextPart[] = [];

    for (const part of parts) {
        const remaining = budget - used;
        if (remaining <= 0) return { parts: trimTail(kept), truncated: true };

        if (part.text.length <= remaining) {
            kept.push(part);
            used += part.text.length;
            continue;
        }

        // A styled span (mention/hashtag/redacted chip) is atomic — drop it
        // rather than slicing it, and stop here. Trim the tail of whatever
        // preceded it so the ellipsis doesn't float off a trailing space.
        if (part.config) return { parts: trimTail(kept), truncated: true };

        // Plain text: cut back to the last word break in the overflowing
        // slice, unless that throws away most of it.
        const slice = part.text.slice(0, remaining);
        const lastBreak = slice.lastIndexOf(' ');
        const cut = lastBreak > remaining * 0.6 ? slice.slice(0, lastBreak) : slice;
        kept.push({ ...part, text: cut.replace(/\s+$/, '') });
        return { parts: kept, truncated: true };
    }

    return { parts: kept, truncated: false };
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
    collapseAfter,
    expandable = true,
}: {
    content?: string | null;
    textStyle?: StyleProp<TextStyle>;
    onMentionPress?: (mention: MentionTapTarget) => void;
    onHashtagPress?: (tag: string) => void;
    /**
     * Character budget past which the body is cut short. Omit for the full
     * text (post detail, comment threads); pass a number in the feed, where
     * a caption running for several screens buries every post under it.
     */
    collapseAfter?: number;
    /**
     * Whether the cut-off body can be opened in place with "Show more". False
     * leaves a plain ellipsis — for previews that already navigate somewhere
     * on tap (the embedded original inside a quote repost), where a second,
     * competing tap target would just be confusing.
     */
    expandable?: boolean;
}) {
    const router = useRouter();
    const clean = stripHtml(content || '');

    // Keyed on the content itself rather than a bare boolean: FlashList
    // recycles these cells, so a plain `useState(false)` would carry one
    // post's expanded state over to whichever post lands in that cell next.
    const [expandedFor, setExpandedFor] = useState<string | null>(null);
    const expanded = expandedFor === clean;

    const { fullParts, collapsedParts, truncated } = useMemo(() => {
        const full = parseValue(clean, configs).parts;
        if (!collapseAfter || clean.length <= collapseAfter + COLLAPSE_SLACK) {
            return { fullParts: full, collapsedParts: full, truncated: false };
        }
        const cut = truncateParts(full, collapseAfter);
        return { fullParts: full, collapsedParts: cut.parts, truncated: cut.truncated };
    }, [clean, collapseAfter]);

    if (!clean) return null;

    const collapsed = truncated && !expanded;
    const visibleParts = collapsed ? collapsedParts : fullParts;

    return (
        <Text style={textStyle}>
            {visibleParts.map((part, index) => {
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

                // Pattern match: redacted word — a grey, non-interactive chip.
                // The server never sends the actual slur for a 'redacted'
                // item (see lib/moderationRedaction.ts), just this marker, so
                // there's nothing to reveal here even if we wanted to.
                if (part.text === REDACTED_MARKER) {
                    return (
                        <Text
                            key={index}
                            style={{
                                backgroundColor: '#D1D5DB',
                                color: '#6B7280',
                                fontWeight: '600',
                                fontSize: 12,
                                borderRadius: 4,
                                overflow: 'hidden',
                                paddingHorizontal: 4,
                            }}
                        >
                            {'  hidden word  '}
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
            {collapsed && (
                <Text
                    // Inherits the body's size/line height so the tail sits on
                    // the same line as the text it follows.
                    onPress={expandable ? () => setExpandedFor(clean) : undefined}
                    suppressHighlighting
                >
                    {'\u2026'}
                    {expandable && (
                        <Text style={{ color: PRIMARY, fontWeight: '700' }}>{' Show more'}</Text>
                    )}
                </Text>
            )}
        </Text>
    );
}
