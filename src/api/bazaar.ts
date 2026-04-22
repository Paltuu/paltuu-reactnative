import client from './client';

export interface BazaarFilters {
  category?: string;
  categorySlug?: string;
  sortBy?: 'trending' | 'discount' | 'price_low' | 'price_high' | 'new' | 'price_asc' | 'price_desc';
  keyword?: string;
  petType?: string;
  page?: number;
  limit?: number;
}

export const bazaarApi = {
  // Main endpoint for fetching products (used on dashboard and bazaar)
  async getProducts(params: BazaarFilters = {}) {
    const { data } = await client.get('/bazaar/products', { params });
    return data;
  },

  async getProductDetails(id: number) {
    const { data } = await client.get(`/bazaar/products/${id}`);
    return data;
  },

  async getBazaarCategories() {
    const { data } = await client.get('/bazaar/categories');
    return data;
  },

  async getBazaarCollections() {
    const { data } = await client.get('/bazaar/collections');
    return data;
  }
};
