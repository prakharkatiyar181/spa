import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
import { format } from 'date-fns';
import apiClient from '../../api/apiClient';

const extractTherapistList = (payload) => {
  const candidates = [
    payload?.data?.data?.list?.data,
    payload?.data?.data?.list?.therapists,
    payload?.data?.data?.therapists,
    payload?.data?.list?.data,
    payload?.data?.list?.therapists,
    payload?.data?.therapists,
    payload?.data?.data?.list,
    payload?.data?.data,
    payload?.data?.list,
    payload?.data,
    payload?.list?.therapists,
    payload?.therapists,
    payload?.list,
    payload,
  ];

  return candidates.find(Array.isArray) || [];
};

const hasTherapistList = (payload) => {
  const candidates = [
    payload?.data?.data?.list?.data,
    payload?.data?.data?.list?.therapists,
    payload?.data?.data?.therapists,
    payload?.data?.list?.data,
    payload?.data?.list?.therapists,
    payload?.data?.therapists,
    payload?.data?.data?.list,
    payload?.data?.data,
    payload?.data?.list,
    payload?.data,
    payload?.list?.data,
    payload?.list?.therapists,
    payload?.therapists,
    payload?.list,
    payload,
  ];

  return candidates.some(Array.isArray);
};

export const fetchTherapists = createAsyncThunk(
  'therapist/fetchTherapists',
  async (overrides = {}, { getState, rejectWithValue }) => {
    try {
      const user = getState().auth.user;
      const serviceAt = overrides.serviceAt || format(new Date(), 'dd-MM-yyyy HH:mm:ss');
      const serviceId = overrides.serviceId || 1;
      const outletId = overrides.outletId || user?.outlet_id || 1;
      const outletTypeId = overrides.outletTypeId || user?.outlet_type_id || 1;

      const response = await apiClient.get('/api/v1/therapists', {
        params: {
          availability: 1,
          outlet: outletId,
          service_at: serviceAt,
          services: serviceId,
          status: 1,
          pagination: 0,
          panel: 'outlet',
          outlet_type: outletTypeId,
          leave: 0,
        },
      });

      if (!hasTherapistList(response.data)) {
        const message =
          response.data?.data?.data?.list?.message ||
          response.data?.data?.message ||
          response.data?.message ||
          'Unexpected therapist response shape';

        throw new Error(message);
      }

      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

const selectTherapistById = (state) => state.therapist.byId;
const selectTherapistAllIds = (state) => state.therapist.allIds;

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
        const list = extractTherapistList(action.payload);
        
        state.byId['unassigned'] = { id: 'unassigned', name: 'Unassigned', gender: 'Unknown' };
        state.allIds = ['unassigned'];

        list.forEach(t => {
          if (t.id) {
             state.byId[t.id] = {
               id: t.id,
               name: t.name || t.full_name || t.first_name || t.therapist_name || 'Therapist',
               gender: t.gender || 'Unknown'
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

export const selectAllTherapists = createSelector(
  [selectTherapistById, selectTherapistAllIds],
  (byId, allIds) => allIds.map((id) => byId[id]).filter(Boolean)
);
export const selectTherapistStatus = state => state.therapist.status;

export default therapistSlice.reducer;
