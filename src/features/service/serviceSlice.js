import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { format } from 'date-fns';
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
  async (overrides = {}, { getState, rejectWithValue }) => {
    try {
      const user = getState().auth.user;
      const response = await apiClient.get('/api/v1/service-category', {
        params: {
          pagination: 0,
          panel: 'outlet',
          outlet: overrides.outletId || user?.outlet_id || 1,
          outlet_type: overrides.outletTypeId || user?.outlet_type_id || 1,
          status: overrides.status ?? 1,
          therapist: overrides.therapistId,
          service_at: overrides.serviceAt || format(new Date(), 'dd-MM-yyyy HH:mm:ss'),
        },
      });
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
