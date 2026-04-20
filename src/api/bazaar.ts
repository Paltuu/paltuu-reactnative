import client from './client';

export const bazaarApi = {
  async getProducts(params?: { category?: number; collection?: number; page?: number }) {
    const { data } = await client.get('/v1/bazaar/products', { params });
    return data;
  },

  async getCategories() {
    const { data } = await client.get('/v1/bazaar/categories');
    return data;
  },

  async getCollections() {
    const { data } = await client.get('/v1/bazaar/collections');
    return data;
  },

  async getCart() {
    const { data } = await client.get('/v1/bazaar/cart');
    return data;
  },

  async addToCart(productId: number, variantId?: number, quantity: number = 1) {
    const { data } = await client.post('/v1/bazaar/cart', { productId, variantId, quantity });
    return data;
  }
};
