import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  selectedBookingId: null,
  isPanelOpen: false,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    openPanel: (state, action) => {
      state.selectedBookingId = action.payload;
      state.isPanelOpen = true;
    },
    closePanel: (state) => {
      state.selectedBookingId = null;
      state.isPanelOpen = false;
    },
  },
});

export const { openPanel, closePanel } = uiSlice.actions;

export const selectSelectedBookingId = (state) => state.ui.selectedBookingId;
export const selectIsPanelOpen = (state) => state.ui.isPanelOpen;

export default uiSlice.reducer;
