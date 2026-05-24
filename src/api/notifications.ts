import client from './client';

export const notificationsApi = {
  async getUnreadCount() {
    const { data } = await client.get('/social/notifications/unread-count');
    return data as { unread_count: number };
  },
  
  async getNotifications(cursor?: string) {
    const url = cursor 
      ? `/social/notifications?cursor=${cursor}`
      : `/social/notifications`;
    const { data } = await client.get(url);
    return data;
  },

  async markAsRead(notificationId?: number) {
    if (notificationId) {
      const { data } = await client.post(`/social/notifications/${notificationId}/read`);
      return data;
    } else {
      const { data } = await client.post(`/social/notifications/read-all`);
      return data;
    }
  }
};
