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
import assistantReducer from './slices/assistant-slice';

// Nested persist (redux-persist's documented pattern for persisting only
// part of a slice): only `conversationUuid` survives an app restart, not
// `messages` — the server is the source of truth for message content
// (`loadAssistantHistory` refetches it), and re-showing stale local text
// after a relaunch would just fight with that. This works independently of
// `persistedReducer`'s own `whitelist` below (which doesn't include
// `assistant` at all) — a persistReducer nested inside combineReducers
// bootstraps and persists itself regardless of whether an outer
// persistReducer's whitelist mentions its key.
const persistedAssistantReducer = persistReducer(
  { key: 'assistant', storage: AsyncStorage, blacklist: ['messages'] },
  assistantReducer,
);

const rootReducer = combineReducers({
  pendingLogin: pendingLoginReducer,
  pendingSignup: pendingSignupReducer,
  auth: authReducer,
  permissions: permissionsReducer,
  toast: toastReducer,
  assistant: persistedAssistantReducer,
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
    // `assistant` has its own nested persistReducer above (conversationUuid
    // only), so it's deliberately left out of this whitelist too.
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
