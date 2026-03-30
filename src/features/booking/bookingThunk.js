import { createAsyncThunk } from '@reduxjs/toolkit';
import { format } from 'date-fns';
import apiClient from '../../api/apiClient';

export const buildBookingListParams = (user, overrides = {}) => {
  const startDate = overrides.startDate || format(new Date(), 'dd-MM-yyyy');
  const endDate = overrides.endDate || startDate;

  return {
    pagination: 1,
    daterange: `${startDate} / ${endDate}`,
    outlet: overrides.outletId || user?.outlet_id || 1,
    panel: 'outlet',
    view_type: 'calendar',
  };
};

export const extractBookingsList = (payload) => {
  const candidates = [
    payload?.data?.data?.list?.bookings?.data,
    payload?.data?.data?.list?.bookings,
    payload?.data?.data?.list?.data,
    payload?.data?.data?.bookings?.data,
    payload?.data?.data?.bookings,
    payload?.data?.list?.bookings?.data,
    payload?.data?.list?.bookings,
    payload?.data?.list?.data,
    payload?.data?.bookings?.data,
    payload?.data?.bookings,
    payload?.list?.bookings?.data,
    payload?.data?.data?.list,
    payload?.data?.data,
    payload?.data?.list,
    payload?.data,
    payload?.list?.bookings,
    payload?.list?.data,
    payload?.bookings,
    payload?.list,
    payload,
  ];

  return candidates.find(Array.isArray) || [];
};

export const fetchBookings = createAsyncThunk(
  'booking/fetchBookings',
  async (overrides = {}, { getState, rejectWithValue }) => {
    try {
      const user = getState().auth.user;
      const response = await apiClient.get('/api/v1/bookings/outlet/booking/list', {
        params: buildBookingListParams(user, overrides),
      });

      const bookings = extractBookingsList(response.data);
      if (!bookings.length) {
        const message =
          response.data?.data?.data?.list?.message ||
          response.data?.data?.message ||
          response.data?.message;

        if (message) {
          throw new Error(message);
        }
      }

      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);
