import { combineReducers } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice';
import bookingReducer from '../features/booking/bookingSlice';
import therapistReducer from '../features/therapist/therapistSlice';
import serviceReducer from '../features/service/serviceSlice';
import roomReducer from '../features/room/roomSlice';
import uiReducer from '../features/ui/uiSlice';

const rootReducer = combineReducers({
  auth: authReducer,
  booking: bookingReducer,
  therapist: therapistReducer,
  service: serviceReducer,
  room: roomReducer,
  ui: uiReducer,
});

export default rootReducer;
