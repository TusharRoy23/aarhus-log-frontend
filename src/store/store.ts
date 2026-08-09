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
import employeesReducer from './slices/employees-slice';

const rootReducer = combineReducers({
  pendingLogin: pendingLoginReducer,
  pendingSignup: pendingSignupReducer,
  auth: authReducer,
  employees: employeesReducer,
});

const persistedReducer = persistReducer(
  {
    key: 'root',
    storage: AsyncStorage,
    // Nothing whitelisted yet: `pendingLogin`/`pendingSignup` carry a raw
    // password and must never hit disk; `auth` (user/organization) is safe
    // to persist but currently resets on every app restart until that's
    // deliberately decided — add 'auth' here to make login survive a restart.
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
  enhancers: (getDefaultEnhancers) =>
    getDefaultEnhancers().concat(devToolsEnhancer()),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof rootReducer>;
export type AppDispatch = typeof store.dispatch;
