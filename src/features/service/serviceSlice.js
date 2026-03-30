import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import apiClient from '../../api/apiClient';

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
      state.categories = action.payload?.data || [];
    });
  }
});

export default serviceSlice.reducer;
