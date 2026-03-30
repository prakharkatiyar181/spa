import { createAsyncThunk } from '@reduxjs/toolkit';
import apiClient from '../../api/apiClient';

/**
 * Helper to prepare FormData for booking APIs
 */
const prepareBookingFormData = (data) => {
  const formData = new FormData();
  Object.keys(data).forEach(key => {
    // PRODUCTION FIX 4: Ensure items array is correctly stringified for payload
    if (key === 'items') {
      formData.append(key, JSON.stringify(data[key]));
    } else if (data[key] !== null && data[key] !== undefined) {
      formData.append(key, data[key]);
    }
  });
  return formData;
};

export const createBooking = createAsyncThunk(
  'booking/createBooking',
  async (bookingData, { rejectWithValue }) => {
    try {
      const formData = prepareBookingFormData(bookingData);
      const response = await apiClient.post('/api/v1/bookings/create', formData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const updateBooking = createAsyncThunk(
  'booking/updateBooking',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const formData = prepareBookingFormData(data);
      const response = await apiClient.post(`/api/v1/bookings/${id}`, formData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const cancelBooking = createAsyncThunk(
  'booking/cancelBooking',
  async (payload, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      const bookingId = typeof payload === 'object' ? payload.bookingId : payload;
      const companyId = typeof payload === 'object' ? payload.companyId : undefined;
      const type = typeof payload === 'object' ? payload.type || 'normal' : 'normal';

      if (companyId) {
        formData.append('company', companyId);
      }
      formData.append('id', bookingId);
      formData.append('type', type);
      formData.append('panel', 'outlet');
      const response = await apiClient.post('/api/v1/bookings/item/cancel', formData);
      return { id: bookingId, ...response.data };
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const fetchBookingDetails = createAsyncThunk(
  'booking/fetchBookingDetails',
  async (bookingId, { rejectWithValue }) => {
    try {
      const response = await apiClient.get(`/api/v1/bookings/booking-details/${bookingId}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const updateBookingStatus = createAsyncThunk(
  'booking/updateBookingStatus',
  async ({ bookingId, companyId, status, outletTypeId }, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      if (companyId) {
        formData.append('company', companyId);
      }
      formData.append('id', bookingId);
      formData.append('status', status);
      formData.append('panel', 'outlet');
      if (outletTypeId) {
        formData.append('outlet_type', outletTypeId);
      }

      const response = await apiClient.post('/api/v1/bookings/update/payment-status', formData);
      return { id: bookingId, status, ...response.data };
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const deleteBooking = createAsyncThunk(
  'booking/deleteBooking',
  async (bookingId, { rejectWithValue }) => {
    try {
      const response = await apiClient.delete(`/api/v1/bookings/destroy/${bookingId}`);
      return { id: bookingId, ...response.data };
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);
