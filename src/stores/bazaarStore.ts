import { create } from 'zustand';
import { bazaarApi, BazaarFilters } from '../api/bazaar';

interface BazaarState {
  products: any[];
  categories: any[];
  collections: any[];
  isLoading: boolean;
  isFetchingNextPage: boolean;
  error: string | null;
  filters: BazaarFilters;
  meta: {
    page: number;
    totalPages: number;
    total: number;
  };

  // Actions
  fetchProducts: (filters?: Partial<BazaarFilters>, reset?: boolean) => Promise<void>;
  fetchNextPage: () => Promise<void>;
  fetchCategories: () => Promise<void>;
  fetchCollections: () => Promise<void>;
  setFilters: (filters: Partial<BazaarFilters>) => void;
  resetFilters: () => void;

  // Cache/Detail management
  selectedProduct: any | null;
  setSelectedProduct: (product: any) => void;
}

export const useBazaarStore = create<BazaarState>((set, get) => ({
  products: [],
  categories: [],
  collections: [],
  isLoading: false,
  isFetchingNextPage: false,
  error: null,
  filters: {
    limit: 20,
    page: 1,
  },
  meta: {
    page: 1,
    totalPages: 1,
    total: 0
  },
  selectedProduct: null,

  fetchProducts: async (newFilters, reset = true) => {
    const currentFilters = get().filters;
    const finalFilters = { ...currentFilters, ...newFilters, page: reset ? 1 : currentFilters.page };

    set({ isLoading: reset, error: null, filters: finalFilters });

    try {
      const response = await bazaarApi.getProducts(finalFilters);

      const findArray = (obj: any): any[] => {
        if (Array.isArray(obj)) return obj;
        if (obj && typeof obj === 'object') {
          for (const key in obj) {
            if (Array.isArray(obj[key])) return obj[key];
          }
        }
        return [];
      };

      const newProducts = findArray(response);
      const meta = response?.meta || { page: 1, totalPages: 1, total: newProducts.length };

      set((state) => ({
        products: reset ? newProducts : [...state.products, ...newProducts],
        meta,
        isLoading: false,
        isFetchingNextPage: false
      }));
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch products', isLoading: false, isFetchingNextPage: false });
    }
  },

  fetchNextPage: async () => {
    const { meta, isLoading, isFetchingNextPage, fetchProducts } = get();
    if (isLoading || isFetchingNextPage || meta.page >= meta.totalPages) return;

    set({ isFetchingNextPage: true });
    await fetchProducts({ page: meta.page + 1 }, false);
  },

  fetchCategories: async () => {
    try {
      const response = await bazaarApi.getBazaarCategories();
      set({ categories: Array.isArray(response) ? response : (response?.data || []) });
    } catch (error) {
      console.error('Failed to fetch categories', error);
    }
  },

  fetchCollections: async () => {
    try {
      const response = await bazaarApi.getBazaarCollections();
      set({ collections: Array.isArray(response) ? response : (response?.data || []) });
    } catch (error) {
      console.error('Failed to fetch collections', error);
    }
  },

  setFilters: (newFilters) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters }
    }));
  },

  resetFilters: () => {
    set({
      filters: { limit: 20, page: 1 }
    });
  },

  setSelectedProduct: (product) => {
    set({ selectedProduct: product });
  },
}));
