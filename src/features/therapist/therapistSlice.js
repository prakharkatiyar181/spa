import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import apiClient from '../../api/apiClient';

export const fetchTherapists = createAsyncThunk(
  'therapist/fetchTherapists',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get('/api/v1/therapists');
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

const initialState = {
  byId: {},
  allIds: [],
  status: 'idle',
  error: null,
};

const therapistSlice = createSlice({
  name: 'therapist',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchTherapists.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchTherapists.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const list = action.payload?.data?.data || action.payload?.data || [];
        
        state.byId['unassigned'] = { id: 'unassigned', name: 'Unassigned', gender: 'Unknown' };
        state.allIds = ['unassigned'];

        list.forEach(t => {
          if (t.id) {
             state.byId[t.id] = {
               id: t.id,
               name: t.name || t.first_name || 'Therapist',
               gender: t.gender || 'Female'
             };
             state.allIds.push(t.id);
          }
        });
      })
      .addCase(fetchTherapists.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });
  }
});

export const selectAllTherapists = state => state.therapist.allIds.map(id => state.therapist.byId[id]);
export const selectTherapistStatus = state => state.therapist.status;

export default therapistSlice.reducer;