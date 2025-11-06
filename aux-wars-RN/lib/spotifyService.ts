import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';

// Spotify API configuration
const SPOTIFY_CLIENT_ID = process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_ID || '';
const SPOTIFY_REDIRECT_URI = process.env.EXPO_PUBLIC_SPOTIFY_REDIRECT_URI || 'auxwarsrn://spotify-callback';
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3000';

// Spotify API endpoints
const SPOTIFY_AUTH_URL = 'https://accounts.spotify.com/authorize';
const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';
const SPOTIFY_API_URL = 'https://api.spotify.com/v1';

// Required Spotify scopes
const SCOPES = [
  'user-read-private',
  'user-read-email',
  'streaming',
  'user-read-playback-state',
  'user-modify-playback-state',
];

// Storage keys
const STORAGE_KEYS = {
  ACCESS_TOKEN: 'spotify_access_token',
  REFRESH_TOKEN: 'spotify_refresh_token',
  TOKEN_EXPIRY: 'spotify_token_expiry',
};

export interface SpotifyArtist {
  id: string;
  name: string;
  images: { url: string; height: number; width: number }[];
  genres: string[];
  popularity: number;
}

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: { id: string; name: string }[];
  album: {
    id: string;
    name: string;
    images: { url: string; height: number; width: number }[];
  };
  duration_ms: number;
  preview_url: string | null;
  uri: string;
  popularity: number;
}

/**
 * SpotifyService - Handles all Spotify API interactions
 */
class SpotifyService {
  /**
   * Initiate Spotify OAuth login flow
   */
  async loginWithSpotify(): Promise<string | null> {
    try {
      // Create authorization URL
      const state = Math.random().toString(36).substring(7);
      const authUrl = `${SPOTIFY_AUTH_URL}?${new URLSearchParams({
        response_type: 'code',
        client_id: SPOTIFY_CLIENT_ID,
        scope: SCOPES.join(' '),
        redirect_uri: SPOTIFY_REDIRECT_URI,
        state,
      })}`;

      // Open browser for authentication
      const result = await WebBrowser.openAuthSessionAsync(
        authUrl,
        SPOTIFY_REDIRECT_URI
      );

      if (result.type === 'success' && result.url) {
        const params = new URL(result.url).searchParams;
        const code = params.get('code');
        
        if (code) {
          // Exchange code for tokens via backend
          await this.exchangeCodeForTokens(code);
          return code;
        }
      }

      return null;
    } catch (error) {
      console.error('Spotify login error:', error);
      throw error;
    }
  }

  /**
   * Exchange authorization code for access/refresh tokens
   */
  private async exchangeCodeForTokens(code: string): Promise<void> {
    try {
      // Call backend to exchange code for tokens (keeps client_secret secure)
      const response = await axios.post(`${BACKEND_URL}/api/spotify/token`, {
        code,
        redirect_uri: SPOTIFY_REDIRECT_URI,
      });

      const { access_token, refresh_token, expires_in } = response.data;

      // Store tokens securely
      await this.storeTokens(access_token, refresh_token, expires_in);
    } catch (error) {
      console.error('Token exchange error:', error);
      throw error;
    }
  }

  /**
   * Store tokens in secure storage
   */
  private async storeTokens(
    accessToken: string,
    refreshToken: string,
    expiresIn: number
  ): Promise<void> {
    const expiryTime = Date.now() + expiresIn * 1000;

    await SecureStore.setItemAsync(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
    await SecureStore.setItemAsync(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
    await SecureStore.setItemAsync(
      STORAGE_KEYS.TOKEN_EXPIRY,
      expiryTime.toString()
    );
  }

  /**
   * Get valid access token (refreshes if expired)
   */
  async getAccessToken(): Promise<string | null> {
    try {
      const accessToken = await SecureStore.getItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
      const expiryTime = await SecureStore.getItemAsync(STORAGE_KEYS.TOKEN_EXPIRY);

      if (!accessToken || !expiryTime) {
        return null;
      }

      // Check if token is expired
      if (Date.now() >= parseInt(expiryTime)) {
        // Token expired, refresh it
        return await this.refreshAccessToken();
      }

      return accessToken;
    } catch (error) {
      console.error('Get access token error:', error);
      return null;
    }
  }

  /**
   * Refresh the access token using refresh token
   */
  private async refreshAccessToken(): Promise<string | null> {
    try {
      const refreshToken = await SecureStore.getItemAsync(
        STORAGE_KEYS.REFRESH_TOKEN
      );

      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      // Call backend to refresh token
      const response = await axios.post(`${BACKEND_URL}/api/spotify/refresh`, {
        refresh_token: refreshToken,
      });

      const { access_token, expires_in } = response.data;

      // Store new access token
      const expiryTime = Date.now() + expires_in * 1000;
      await SecureStore.setItemAsync(STORAGE_KEYS.ACCESS_TOKEN, access_token);
      await SecureStore.setItemAsync(
        STORAGE_KEYS.TOKEN_EXPIRY,
        expiryTime.toString()
      );

      return access_token;
    } catch (error) {
      console.error('Token refresh error:', error);
      return null;
    }
  }

  /**
   * Search for artists on Spotify
   */
  async searchArtists(query: string): Promise<SpotifyArtist[]> {
    try {
      const accessToken = await this.getAccessToken();
      if (!accessToken) {
        throw new Error('Not authenticated with Spotify');
      }

      const response = await axios.get(`${SPOTIFY_API_URL}/search`, {
        params: {
          q: query,
          type: 'artist',
          limit: 10,
        },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      return response.data.artists.items;
    } catch (error) {
      console.error('Artist search error:', error);
      throw error;
    }
  }

  /**
   * Get an artist's top tracks
   */
  async getArtistTopTracks(artistId: string): Promise<SpotifyTrack[]> {
    try {
      const accessToken = await this.getAccessToken();
      if (!accessToken) {
        throw new Error('Not authenticated with Spotify');
      }

      const response = await axios.get(
        `${SPOTIFY_API_URL}/artists/${artistId}/top-tracks`,
        {
          params: {
            market: 'US', // Can be made dynamic based on user's location
          },
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      return response.data.tracks;
    } catch (error) {
      console.error('Get artist tracks error:', error);
      throw error;
    }
  }

  /**
   * Get multiple tracks by IDs
   */
  async getTracks(trackIds: string[]): Promise<SpotifyTrack[]> {
    try {
      const accessToken = await this.getAccessToken();
      if (!accessToken) {
        throw new Error('Not authenticated with Spotify');
      }

      const response = await axios.get(`${SPOTIFY_API_URL}/tracks`, {
        params: {
          ids: trackIds.join(','),
        },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      return response.data.tracks;
    } catch (error) {
      console.error('Get tracks error:', error);
      throw error;
    }
  }

  /**
   * Check if user is authenticated with Spotify
   */
  async isAuthenticated(): Promise<boolean> {
    const accessToken = await this.getAccessToken();
    return accessToken !== null;
  }

  /**
   * Logout - clear all stored tokens
   */
  async logout(): Promise<void> {
    await SecureStore.deleteItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
    await SecureStore.deleteItemAsync(STORAGE_KEYS.REFRESH_TOKEN);
    await SecureStore.deleteItemAsync(STORAGE_KEYS.TOKEN_EXPIRY);
  }
}

// Export singleton instance
export default new SpotifyService();

