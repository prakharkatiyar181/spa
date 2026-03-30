import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
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
      state.list = extractRoomList(action.payload);
    });
  }
});

export default roomSlice.reducer;
