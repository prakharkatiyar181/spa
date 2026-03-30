import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
import apiClient from '../../api/apiClient';

const extractTherapistList = (payload) => {
  const candidates = [
    payload?.data?.data?.list?.staffs,
    payload?.data?.data?.list?.data,
    payload?.data?.data?.list?.therapists,
    payload?.data?.data?.staffs,
    payload?.data?.data?.therapists,
    payload?.data?.list?.staffs,
    payload?.data?.list?.data,
    payload?.data?.list?.therapists,
    payload?.data?.staffs,
    payload?.data?.therapists,
    payload?.data?.data?.list,
    payload?.data?.data,
    payload?.data?.list,
    payload?.data,
    payload?.list?.staffs,
    payload?.list?.therapists,
    payload?.staffs,
    payload?.therapists,
    payload?.list,
    payload,
  ];

  return candidates.find(Array.isArray) || [];
};

const hasTherapistList = (payload) => {
  const candidates = [
    payload?.data?.data?.list?.staffs,
    payload?.data?.data?.list?.data,
    payload?.data?.data?.list?.therapists,
    payload?.data?.data?.staffs,
    payload?.data?.data?.therapists,
    payload?.data?.list?.staffs,
    payload?.data?.list?.data,
    payload?.data?.list?.therapists,
    payload?.data?.staffs,
    payload?.data?.therapists,
    payload?.data?.data?.list,
    payload?.data?.data,
    payload?.data?.list,
    payload?.data,
    payload?.list?.data,
    payload?.list?.staffs,
    payload?.list?.therapists,
    payload?.staffs,
    payload?.therapists,
    payload?.list,
    payload,
  ];

  return candidates.some(Array.isArray);
};

const normalizeGender = (value) => {
  const gender = String(value || '').trim().toLowerCase();

  if (gender === 'm' || gender === 'male') return 'Male';
  if (gender === 'f' || gender === 'female') return 'Female';
  return 'Unknown';
};

const normalizeAvailability = (value) => {
  if (value === undefined || value === null || value === '') return true;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;

  const normalized = String(value).trim().toLowerCase();
  return !['0', 'false', 'no', 'off'].includes(normalized);
};

const normalizeName = (therapist) => {
  const fullName = [therapist?.name, therapist?.lastname].filter(Boolean).join(' ').trim();

  return (
    therapist?.alias ||
    fullName ||
    therapist?.full_name ||
    therapist?.first_name ||
    therapist?.therapist_name ||
    therapist?.code ||
    'Therapist'
  );
};

export const fetchTherapists = createAsyncThunk(
  'therapist/fetchTherapists',
  async (overrides = {}, { getState, rejectWithValue }) => {
    try {
      const user = getState().auth.user;
      const outletId = overrides.outletId || user?.outlet_id || 1;
      const outletTypeId = overrides.outletTypeId || user?.outlet_type_id || 1;
      const params = {
        outlet: outletId,
        status: overrides.status ?? 1,
        pagination: overrides.pagination ?? 0,
        panel: 'outlet',
        outlet_type: outletTypeId,
        leave: overrides.leave ?? 0,
      };

      if (overrides.availability !== undefined) {
        params.availability = overrides.availability;
      }

      if (overrides.serviceAt) {
        params.service_at = overrides.serviceAt;
      }

      if (overrides.serviceId) {
        params.services = overrides.serviceId;
      }

      const response = await apiClient.get('/api/v1/therapists', {
        params,
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
        state.error = null;
      })
      .addCase(fetchTherapists.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const list = extractTherapistList(action.payload);
        
        state.byId['unassigned'] = { id: 'unassigned', name: 'Unassigned', gender: 'Unknown' };
        state.allIds = ['unassigned'];

        list.forEach(t => {
          const therapistId = t.id || t.therapist_id;

          if (therapistId) {
             state.byId[therapistId] = {
               id: therapistId,
               name: normalizeName(t),
               gender: normalizeGender(t.gender || t.sex),
               isAvailable: normalizeAvailability(
                 t.availability ?? t.is_available ?? t.is_on_duty
               ),
             };
             state.allIds.push(therapistId);
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
