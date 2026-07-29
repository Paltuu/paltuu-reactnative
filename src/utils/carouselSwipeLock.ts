import { makeMutable } from 'react-native-reanimated';

// Home's "swipe right to open the composer" pan (app/(app)/(tabs)/index.tsx)
// and a post's media carousel (PostCard's MediaBlock) both want left-to-right
// swipes. Once a carousel is scrolled past its first slide, swiping back
// toward that slide is a carousel gesture — but the pan wraps the whole feed
// and can't see that a nested ScrollView is already handling the touch, so it
// fires too and pushes the composer on top of the feed.
//
// The carousel publishes its scroll offset the moment a drag begins; the pan
// reads it on the UI thread and stands down when the drag started anywhere but
// the first slide. Only one carousel can be dragged at a time, so a single
// value is enough.
//
// The pan clears this in onFinalize (which fires on touch release whether or
// not the pan activated), so a stale offset can never outlive the gesture that
// set it — important because a drag short enough to snap back without
// momentum never emits onMomentumScrollEnd.
export const carouselDragStartOffsetX = makeMutable(0);
