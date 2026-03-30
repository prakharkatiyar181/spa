import { createSlice } from '@reduxjs/toolkit';
import { fetchBookings, extractBookingsList } from './bookingThunk';
import { createBooking } from './bookingCrudThunks';
import { addMinutes, parseISO } from 'date-fns';

const initialState = {
  byId: {},
  allIds: [],
  status: 'idle',
  error: null,
  backup: null,
  lastSyncedAt: null,
};

const bookingSlice = createSlice({
  name: 'booking',
  initialState,
  reducers: {
    rollback: (state) => {
      if (state.backup) {
        state.byId = state.backup.byId;
        state.allIds = state.backup.allIds;
        state.backup = null;
      }
    },
    rescheduleBooking: (state, action) => {
      const { id, newStartTime, newTherapistId, newEndTime } = action.payload;
      // PRODUCTION FIX: Deep copy backup to prevent mutation reference bugs
      state.backup = { byId: JSON.parse(JSON.stringify(state.byId)), allIds: [...state.allIds] };
      if (state.byId[id]) {
        state.byId[id].startTime = newStartTime;
        state.byId[id].endTime = newEndTime;
        state.byId[id].therapistId = newTherapistId;
      }
    },
    mergeBookingsIncremental: (state, action) => {
      const { bookings, editingId } = action.payload;
      const safeBookings = Array.isArray(bookings) ? bookings : [];
      const incomingIds = new Set();
      const now = new Date().toISOString();

      safeBookings.forEach(booking => {
        const items = booking.booking_item || {};
        Object.values(items).forEach(item => {
          if (!item || typeof item !== 'object' || !item.id) return;
          incomingIds.add(item.id);
          
          if (item.id === editingId) return;
          if (state.lastSyncedAt && new Date(booking.updated_at || now) < new Date(state.lastSyncedAt)) return;

          const duration = parseInt(item.duration, 10) || 60;
          const normalized = {
            id: item.id,
            bookingId: booking.id,
            therapistId: item.therapist_id || "unassigned",
            therapistName: item.therapist || "Unassigned",
            startTime: item.service_at,
            endTime: addMinutes(parseISO(item.service_at), duration).toISOString(),
            duration,
            status: booking.status === "No-show" ? "Cancelled" : (booking.status || 'Confirmed'),
            service: item.service,
            serviceId: item.service_id,
            room: item.room_items?.[0]?.room_name || "",
            roomId: item.room_items?.[0]?.room_id || "",
            customer: item.customer_name,
            updatedAt: booking.updated_at || now
          };

          if (JSON.stringify(state.byId[item.id]) !== JSON.stringify(normalized)) {
            state.byId[item.id] = normalized;
            if (!state.allIds.includes(item.id)) state.allIds.push(item.id);
          }
        });
      });

      state.allIds = state.allIds.filter(id => {
        if (incomingIds.has(id)) return true;
        delete state.byId[id];
        return false;
      });
      state.lastSyncedAt = now;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchBookings.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchBookings.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const bookings = extractBookingsList(action.payload);
        // REFACTOR: Shared logic call
        bookingSlice.caseReducers.mergeBookingsIncremental(state, { payload: { bookings, editingId: null } });
      })
      .addCase(fetchBookings.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(createBooking.fulfilled, (state) => { state.status = 'succeeded'; });
  },
});

export const { rollback, rescheduleBooking, mergeBookingsIncremental } = bookingSlice.actions;
export default bookingSlice.reducer;
