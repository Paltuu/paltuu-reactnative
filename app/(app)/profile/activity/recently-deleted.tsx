import React from 'react';
import { ActivityFeedScreen } from '../../../../src/components/profile/ActivityFeedScreen';
import { socialApi } from '../../../../src/api/social';
import { withFocusUnmount } from '../../../../src/components/common/withFocusUnmount';

function ActivityRecentlyDeletedScreen() {
  return (
    <ActivityFeedScreen
      title="Recently deleted"
      queryKey="activity-recently-deleted"
      fetchPage={(cursor) => socialApi.getMyRecentlyDeleted(cursor)}
      emptyTitle="Nothing deleted recently"
      emptyMessage="Posts and comments you delete will appear here for 30 days."
      getSubtitle={(item) =>
        item.kind === 'deleted_comment' ? 'Deleted comment' : 'Deleted post'
      }
    />
  );
}

export default withFocusUnmount(ActivityRecentlyDeletedScreen);
