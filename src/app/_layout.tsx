import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
// import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Stack, usePathname, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { Colors } from '../theme/colors';
import { Toast } from '../components/ui';
import { QueryClientProvider } from '@tanstack/react-query';
import queryClient from '../lib/query-client';
import { Provider as StoreProvider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { persistor, store } from '../store/store';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { clearAuth } from '../store/slices/auth-slice';
import { clearPermissions } from '../store/slices/permissions-slice';
import { fetchAndStorePermissions } from '../store/permissions-actions';
import { tokenStore } from '../lib/api/utils';
import { isTokenValid, refreshAccessToken } from '../lib/api/refresh_token_strategy';

// Routes reachable without a valid session. Everything else redirects to
// Login when unauthenticated — new authenticated screens are covered
// automatically, no per-screen enumeration needed. `/sign-up`, `/verify-otp`
// and `/select-organization` already have their own pending-state guards,
// so they're left out of the "already authenticated" redirect below too.
const PUBLIC_ROUTES = new Set(['/', '/sign-up', '/verify-otp', '/select-organization']);

function LoadingScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background }}>
      <ActivityIndicator color={Colors.primary} />
    </View>
  );
}

function useProtectedRoute(isBootstrapping: boolean) {
  const pathname = usePathname();
  const router = useRouter();
  const isAuthenticated = useAppSelector((state) => !!state.auth.user);

  useEffect(() => {
    if (isBootstrapping) return;
    const isPublic = PUBLIC_ROUTES.has(pathname);
    if (!isAuthenticated && !isPublic) {
      router.replace('/');
    } else if (isAuthenticated && pathname === '/') {
      router.replace('/schedules');
    }
  }, [isBootstrapping, isAuthenticated, pathname]);
}

function AppNavigator() {
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const dispatch = useAppDispatch();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await tokenStore.hydrate();
      let token = tokenStore.get();
      if (!isTokenValid(token)) {
        token = await refreshAccessToken();
      }
      if (!token) {
        tokenStore.clear();
        dispatch(clearAuth());
        dispatch(clearPermissions());
        persistor.purge();
        // Same reasoning as the sign-out/401 paths — the query cache
        // outlives Redux state on its own.
        queryClient.clear();
      } else {
        // Refreshes the persisted permission set in the background on
        // every relaunch of an existing session — doesn't block
        // bootstrapping, the last-known copy is already good enough to
        // render the menu with.
        fetchAndStorePermissions(dispatch);
      }
      if (!cancelled) setIsBootstrapping(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [dispatch]);

  useProtectedRoute(isBootstrapping);

  if (isBootstrapping) {
    return <LoadingScreen />;
  }

  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="create-shift" options={{ presentation: 'modal' }} />
        <Stack.Screen name="employee-form" options={{ presentation: 'modal' }} />
        <Stack.Screen name="designation-form" options={{ presentation: 'modal' }} />
      </Stack>
      <Toast />
      <StatusBar style="dark" />
    </SafeAreaProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  if (!fontsLoaded) {
    return <LoadingScreen />;
  }

  return (
    // <GestureHandlerRootView style={{ flex: 1 }}>
    <StoreProvider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <QueryClientProvider client={queryClient}>
          <AppNavigator />
        </QueryClientProvider>
      </PersistGate>
    </StoreProvider>
    // </GestureHandlerRootView>
  );
}
