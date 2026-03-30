import { createSlice } from '@reduxjs/toolkit';
import { fetchBookings, extractBookingsList } from './bookingThunk';
import { createBooking } from './bookingCrudThunks';
import { addMinutes, isValid, parse, parseISO } from 'date-fns';

const initialState = {
  byId: {},
  allIds: [],
  status: 'idle',
  error: null,
  backup: null,
  lastSyncedAt: null,
};

const normalizeId = (value, fallback = '') => {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  return String(value);
};

const parseApiDateTime = (value) => {
  if (!value) return null;

  if (value instanceof Date) {
    return isValid(value) ? value : null;
  }

  const source = String(value).trim();
  const candidates = [
    parseISO(source),
    parse(source, 'yyyy-MM-dd HH:mm:ss', new Date()),
    parse(source, 'yyyy-MM-dd HH:mm', new Date()),
    parse(source, "yyyy-MM-dd'T'HH:mm:ss", new Date()),
    parse(source, "yyyy-MM-dd'T'HH:mm", new Date()),
    parse(source, 'dd-MM-yyyy HH:mm:ss', new Date()),
    parse(source, 'dd-MM-yyyy HH:mm', new Date()),
  ];

  return candidates.find(isValid) || null;
};

const extractBookingItems = (booking) => {
  const items =
    booking?.booking_item ||
    booking?.booking_items ||
    booking?.items ||
    booking?.bookingItems ||
    [];

  if (Array.isArray(items)) {
    return items;
  }

  if (items && typeof items === 'object') {
    return Object.values(items);
  }

  return [];
};

const extractRoomItem = (item) => {
  const roomItems = item?.room_items || item?.roomItems || item?.rooms || [];

  if (Array.isArray(roomItems)) {
    return roomItems[0] || {};
  }

  if (roomItems && typeof roomItems === 'object') {
    return Object.values(roomItems).find(Boolean) || {};
  }

  return {};
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
        const items = extractBookingItems(booking);
        items.forEach(item => {
          if (!item || typeof item !== 'object') return;

          const itemId = normalizeId(item.id || item.booking_item_id);
          if (!itemId) return;

          incomingIds.add(itemId);
          
          if (itemId === normalizeId(editingId)) return;
          if (state.lastSyncedAt && new Date(booking.updated_at || now) < new Date(state.lastSyncedAt)) return;

          const duration = parseInt(item.duration, 10) || 60;
          const startDate = parseApiDateTime(
            item.service_at || item.start_time || item.start_at || booking.service_at || booking.start_time
          );
          if (!startDate) return;

          const roomItem = extractRoomItem(item);
          const therapistId = normalizeId(
            item.therapist_id || item.therapist?.id || booking.therapist_id,
            'unassigned'
          );
          const normalized = {
            id: itemId,
            bookingId: normalizeId(booking.id || booking.booking_id),
            customerId: normalizeId(item.customer_id || booking.customer_id || booking.customer?.id),
            therapistId,
            therapistName: item.therapist || item.therapist_name || booking.therapist_name || 'Unassigned',
            startTime: startDate.toISOString(),
            endTime: addMinutes(startDate, duration).toISOString(),
            duration,
            status: booking.status === 'No-show' ? 'Cancelled' : (booking.status || 'Confirmed'),
            service: item.service || item.service_name || booking.service_name || 'Service',
            serviceId: normalizeId(item.service_id || item.service?.id),
            room: roomItem.room_name || roomItem.name || '',
            roomId: normalizeId(roomItem.room_id || roomItem.id),
            customer: item.customer_name || booking.customer?.name || booking.customer_name || 'Unknown Client',
            customerPhone: item.customer_phone || booking.customer_phone || '',
            note: booking.note || item.note || '',
            source: booking.source || '',
            updatedAt: booking.updated_at || now
          };

          if (JSON.stringify(state.byId[itemId]) !== JSON.stringify(normalized)) {
            state.byId[itemId] = normalized;
            if (!state.allIds.includes(itemId)) state.allIds.push(itemId);
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
