import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import apiClient from '../../api/apiClient';

export const fetchRooms = createAsyncThunk(
  'room/fetchRooms',
  async (outletId, { rejectWithValue }) => {
    try {
      const response = await apiClient.get(`/api/v1/room-bookings/outlet/${outletId}`);
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
      state.list = action.payload?.data || [];
    });
  }
});

export default roomSlice.reducer;
