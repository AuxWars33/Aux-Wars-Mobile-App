import { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

/**
 * Spotify OAuth Callback Handler
 * 
 * This screen handles the redirect from Spotify after user authorization.
 * URL format: auxwarsrn://spotify-callback?code=xxx or auxwarsrn://spotify-callback?error=xxx
 */
export default function SpotifyCallbackScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();

  useEffect(() => {
    const handleSpotifyCallback = async () => {
      // Get the authorization code or error from URL params
      const { code, error } = params;

      if (error) {
        // User denied access or there was an error
        console.error('Spotify auth error:', error);
        // TODO: Show error message to user
        // Wait 2 seconds then redirect to home
        setTimeout(() => {
          router.replace('/');
        }, 2000);
        return;
      }

      if (code) {
        console.log('Spotify authorization code received:', code);
        
        // TODO: Exchange authorization code for access token
        // This should be done via your backend API to keep client_secret secure
        // Example:
        // try {
        //   const response = await fetch('YOUR_BACKEND_URL/api/spotify/token', {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify({ code })
        //   });
        //   const { access_token, refresh_token } = await response.json();
        //   
        //   // Store tokens securely (use expo-secure-store)
        //   await SecureStore.setItemAsync('spotify_access_token', access_token);
        //   await SecureStore.setItemAsync('spotify_refresh_token', refresh_token);
        //   
        //   // Success! Redirect to home
        //   router.replace('/');
        // } catch (error) {
        //   console.error('Token exchange failed:', error);
        // }

        // For now, just redirect back to home
        setTimeout(() => {
          router.replace('/');
        }, 2000);
      } else {
        // No code or error - invalid callback
        console.warn('Invalid Spotify callback - no code or error');
        router.replace('/');
      }
    };

    handleSpotifyCallback();
  }, [params, router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#1DB954" />
      <Text style={styles.text}>Connecting to Spotify...</Text>
      {params.error && (
        <Text style={styles.errorText}>
          Authorization failed. Redirecting...
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  text: {
    marginTop: 16,
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  errorText: {
    marginTop: 8,
    fontSize: 14,
    color: '#ff6b6b',
  },
});

