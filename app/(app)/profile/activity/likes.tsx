import React from 'react';
import { ActivityFeedScreen } from '../../../../src/components/profile/ActivityFeedScreen';
import { socialApi } from '../../../../src/api/social';
import { withFocusUnmount } from '../../../../src/components/common/withFocusUnmount';

function ActivityLikesScreen() {
  return (
    <ActivityFeedScreen
      title="Likes"
      queryKey="activity-likes"
      fetchPage={(cursor) => socialApi.getMyActivityLikes(cursor)}
      emptyTitle="No likes yet"
      emptyMessage="Posts you like will appear here."
      getSubtitle={(item) =>
        item.actor?.name ? `Post by ${item.actor.name}` : 'Liked post'
      }
    />
  );
}

export default withFocusUnmount(ActivityLikesScreen);
