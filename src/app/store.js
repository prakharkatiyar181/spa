import { configureStore } from '@reduxjs/toolkit';
import rootReducer from './rootReducer';
import { loadAuthState, saveAuthState } from './authStorage';

export const store = configureStore({
  reducer: rootReducer,
  preloadedState: loadAuthState(),
});

saveAuthState(store.getState().auth);

store.subscribe(() => {
  saveAuthState(store.getState().auth);
});
