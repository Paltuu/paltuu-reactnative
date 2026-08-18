import React from 'react';
import { ActivityFeedScreen } from '../../../../src/components/profile/ActivityFeedScreen';
import { socialApi } from '../../../../src/api/social';
import { withFocusUnmount } from '../../../../src/components/common/withFocusUnmount';

function ActivityCommentsScreen() {
  return (
    <ActivityFeedScreen
      title="Comments"
      queryKey="activity-comments"
      fetchPage={(cursor) => socialApi.getMyActivityComments(cursor)}
      emptyTitle="No comments yet"
      emptyMessage="Comments you post will appear here."
      getSubtitle={(item) =>
        item.actor?.name ? `On ${item.actor.name}'s post` : 'Your comment'
      }
    />
  );
}

export default withFocusUnmount(ActivityCommentsScreen);
