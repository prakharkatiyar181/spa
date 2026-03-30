import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import apiClient from '../../api/apiClient';

const extractServiceCategories = (payload) => {
  const candidates = [
    payload?.data?.data?.list?.categories,
    payload?.data?.data?.categories,
    payload?.data?.list?.categories,
    payload?.data?.categories,
    payload?.data?.data?.list,
    payload?.data?.data,
    payload?.data?.list,
    payload?.data,
    payload?.list?.categories,
    payload?.categories,
    payload?.list,
    payload,
  ];

  return candidates.find(Array.isArray) || [];
};

export const fetchServiceCategories = createAsyncThunk(
  'service/fetchCategories',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get('/api/v1/service-category');
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

const serviceSlice = createSlice({
  name: 'service',
  initialState: { categories: [], status: 'idle' },
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(fetchServiceCategories.fulfilled, (state, action) => {
      state.categories = extractServiceCategories(action.payload);
    });
  }
});

export default serviceSlice.reducer;
