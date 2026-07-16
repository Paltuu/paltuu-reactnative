import client from './client';

export interface Notification {
  notification_id: number;
  type: string;
  title: string;
  body: string;
  entity_type: string | null;
  entity_id: number | null;
  entity_comment_id: number | null;
  deep_link: string | null;
  image_url: string | null;
  is_read: boolean;
  created_at: string;
  sender: {
    user_id: number;
    name: string;
    profile_image_url: string | null;
    social_username: string | null;
  } | null;
}

export const notificationsApi = {
  async getUnreadCount() {
    const { data } = await client.get('/notifications/unread-count');
    return data as { unread_count: number };
  },

  async getNotifications(params?: {
    cursor?: string;
    limit?: number;
    filter?: string;
    unread_only?: boolean;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.cursor) searchParams.set('cursor', params.cursor);
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.filter) searchParams.set('filter', params.filter);
    if (params?.unread_only) searchParams.set('unread_only', 'true');

    const query = searchParams.toString();
    const { data } = await client.get(`/social/notifications${query ? `?${query}` : ''}`);
    return data as {
      notifications: Notification[];
      unread_count: number;
      next_cursor: string | null;
      has_more: boolean;
    };
  },

  async markRead(params: { notification_id?: number; mark_all_read?: boolean }) {
    if (params.notification_id) {
      // Mark single notification read via dedicated route
      const { data } = await client.post(`/social/notifications/${params.notification_id}/read`);
      return data;
    } else {
      // Mark all as read via PATCH
      const { data } = await client.patch('/social/notifications');
      return data;
    }
  },

  async deleteNotification(notificationId: number) {
    const { data } = await client.delete(`/social/notifications/${notificationId}`);
    return data;
  },

  async registerDevice(params: { fcm_token: string; platform: 'ios' | 'android' }) {
    const { data } = await client.post('/notifications/device', params);
    return data;
  }
};
