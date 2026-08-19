import AsyncStorage from '@react-native-async-storage/async-storage';
import { combineReducers, configureStore } from '@reduxjs/toolkit';
import {
  FLUSH,
  PAUSE,
  PERSIST,
  PURGE,
  persistReducer,
  persistStore,
  REGISTER,
  REHYDRATE,
} from 'redux-persist';
import devToolsEnhancer from "redux-devtools-expo-dev-plugin";

import pendingLoginReducer from './slices/pending-login-slice';
import pendingSignupReducer from './slices/pending-signup-slice';
import authReducer from './slices/auth-slice';
import permissionsReducer from './slices/permissions-slice';
import toastReducer from './slices/toast-slice';

const rootReducer = combineReducers({
  pendingLogin: pendingLoginReducer,
  pendingSignup: pendingSignupReducer,
  auth: authReducer,
  permissions: permissionsReducer,
  toast: toastReducer,
});

const persistedReducer = persistReducer(
  {
    key: 'root',
    storage: AsyncStorage,
    // `pendingLogin`/`pendingSignup` carry a raw password and must never hit
    // disk. `auth` (user/organization) and `permissions` are whitelisted so
    // identity and menu visibility survive an app restart without waiting
    // on a fresh network round-trip — the access/refresh tokens themselves
    // stay out of Redux entirely and live in `tokenStore` (secure-store
    // backed). `toast` is transient UI state, never persisted — a stale
    // error message has no business reappearing on the next app launch.
    whitelist: ['auth', 'permissions'],
  },
  rootReducer,
);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, PAUSE, PERSIST, PURGE, REGISTER, REHYDRATE],
      },
    }),
  enhancers: (getDefaultEnhancers) =>
    getDefaultEnhancers().concat(devToolsEnhancer()),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof rootReducer>;
export type AppDispatch = typeof store.dispatch;
