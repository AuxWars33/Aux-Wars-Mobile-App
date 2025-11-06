import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import LoadingScreen from './screens/LoadingScreen';
import { initializeApp } from './utils/initialization';
import { AuthProvider } from '@/lib/AuthContext';

// Prevent the splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [appIsReady, setAppIsReady] = useState(false);
  const [showCustomLoading, setShowCustomLoading] = useState(true);

  useEffect(() => {
    async function prepare() {
      try {
        // Run app initialization logic
        await initializeApp();
        
        // Hide the native splash screen
        await SplashScreen.hideAsync();
        
        // Set app as ready
        setAppIsReady(true);
        
        // Show custom loading screen animation sequence (2.5s total)
        // Stage 1-3: 2s black screen + Stage 4: 0.5s final screen
        await new Promise(resolve => setTimeout(resolve, 2500));
        
        // Hide custom loading screen
        setShowCustomLoading(false);
      } catch (e) {
        console.warn(e);
        // Even if there's an error, hide the loading screen
        await SplashScreen.hideAsync();
        setShowCustomLoading(false);
      }
    }

    prepare();
  }, []);

  // Show custom loading screen while initializing
  if (!appIsReady || showCustomLoading) {
    return <LoadingScreen />;
  }

  return (
    <AuthProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="auth/login" options={{ headerShown: false }} />
          <Stack.Screen name="auth/signup" options={{ headerShown: false }} />
          <Stack.Screen name="session/create" options={{ headerShown: false }} />
          <Stack.Screen name="session/join" options={{ headerShown: false }} />
          <Stack.Screen name="session/lobby" options={{ headerShown: false }} />
          <Stack.Screen name="session/deck-builder" options={{ headerShown: false }} />
          <Stack.Screen name="session/round" options={{ headerShown: false }} />
          <Stack.Screen name="session/voting" options={{ headerShown: false }} />
          <Stack.Screen name="session/round-results" options={{ headerShown: false }} />
          <Stack.Screen name="session/leaderboard" options={{ headerShown: false }} />
          <Stack.Screen name="spotify-callback" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
          <Stack.Screen name="screens/LoadingScreen" options={{ headerShown: false }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </AuthProvider>
  );
}
