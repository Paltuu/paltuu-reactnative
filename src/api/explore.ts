import client from './client';
import { DiscoveryResponse, SearchResponse } from '../types/explore';

export const exploreApi = {
  async getDiscovery() {
    const { data } = await client.get('/explore/discovery');
    return data as DiscoveryResponse;
  },

  async search(query: string, type: string = 'all', cursor: string | null = null, limit: number = 20) {
    const url = `/explore/search?q=${encodeURIComponent(query)}&type=${type}&limit=${limit}${cursor ? `&cursor=${cursor}` : ''}`;
    const { data } = await client.get(url);
    return data as SearchResponse;
  }
};
