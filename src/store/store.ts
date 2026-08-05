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

import pendingLoginReducer from './slices/pending-login-slice';
import authReducer from './slices/auth-slice';

const rootReducer = combineReducers({
  pendingLogin: pendingLoginReducer,
  auth: authReducer,
});

const persistedReducer = persistReducer(
  {
    key: 'root',
    storage: AsyncStorage,
    // Nothing whitelisted yet: `pendingLogin` carries a raw password and must
    // never hit disk; `auth` (user/organization) is safe to persist but
    // currently resets on every app restart until that's deliberately
    // decided — add 'auth' here to make login survive a restart.
    whitelist: [],
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
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof rootReducer>;
export type AppDispatch = typeof store.dispatch;
