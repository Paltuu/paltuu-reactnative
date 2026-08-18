import React from 'react';
import { ActivityFeedScreen } from '../../../../src/components/profile/ActivityFeedScreen';
import { socialApi } from '../../../../src/api/social';
import { withFocusUnmount } from '../../../../src/components/common/withFocusUnmount';

function ActivityTagsScreen() {
  return (
    <ActivityFeedScreen
      title="Tags"
      queryKey="activity-tags"
      fetchPage={(cursor) => socialApi.getMyActivityTags(cursor)}
      emptyTitle="No tags yet"
      emptyMessage="When someone mentions you in a post or comment, it will show up here."
      getSubtitle={(item) =>
        item.actor?.name ? `${item.actor.name} mentioned you` : 'Mention'
      }
    />
  );
}

export default withFocusUnmount(ActivityTagsScreen);
