import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { format } from 'date-fns';
import apiClient from '../../api/apiClient';

const extractRoomList = (payload) => {
  const candidates = [
    payload?.data?.data?.list?.rooms,
    payload?.data?.data?.rooms,
    payload?.data?.list?.rooms,
    payload?.data?.rooms,
    payload?.data?.data?.list,
    payload?.data?.data,
    payload?.data?.list,
    payload?.data,
    payload?.list?.rooms,
    payload?.rooms,
    payload?.list,
    payload,
  ];

  return candidates.find(Array.isArray) || [];
};

export const fetchRooms = createAsyncThunk(
  'room/fetchRooms',
  async (overrides = {}, { getState, rejectWithValue }) => {
    try {
      const user = getState().auth.user;
      const outletId = overrides.outletId || user?.outlet_id || 1;
      const date = overrides.date || format(new Date(), 'dd-MM-yyyy');
      const duration = overrides.duration || 60;

      const response = await apiClient.get(`/api/v1/room-bookings/outlet/${outletId}`, {
        params: {
          date,
          panel: 'outlet',
          duration,
          service_at: overrides.serviceAt,
          availability: overrides.availability ?? 1,
          user_id: overrides.userId,
          service_id: overrides.serviceId,
        },
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

const roomSlice = createSlice({
  name: 'room',
  initialState: { list: [], status: 'idle' },
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(fetchRooms.fulfilled, (state, action) => {
      state.list = extractRoomList(action.payload);
    });
  }
});

export default roomSlice.reducer;
