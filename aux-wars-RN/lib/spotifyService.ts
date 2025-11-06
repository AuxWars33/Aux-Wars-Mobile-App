import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';

// Spotify API configuration
const SPOTIFY_CLIENT_ID = process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_ID || '';
const SPOTIFY_REDIRECT_URI = process.env.EXPO_PUBLIC_SPOTIFY_REDIRECT_URI || 'auxwarsrn://spotify-callback';
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3000';

// Development mode - bypasses authentication and returns mock data
const DEV_MODE = process.env.EXPO_PUBLIC_DEV_MODE === 'true';

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

// Mock data for development mode
const MOCK_ARTISTS: SpotifyArtist[] = [
  {
    id: 'mock-artist-1',
    name: 'Drake',
    images: [{ url: 'https://i.scdn.co/image/ab6761610000e5eb4293385d324db8558179afd9', height: 640, width: 640 }],
    genres: ['hip hop', 'rap'],
    popularity: 100,
  },
  {
    id: 'mock-artist-2',
    name: 'Taylor Swift',
    images: [{ url: 'https://i.scdn.co/image/ab6761610000e5ebe672b5f553298dcdccb0e676', height: 640, width: 640 }],
    genres: ['pop', 'country'],
    popularity: 98,
  },
  {
    id: 'mock-artist-3',
    name: 'The Weeknd',
    images: [{ url: 'https://i.scdn.co/image/ab6761610000e5eb214f3cf1cbe7139c1e26ffbb', height: 640, width: 640 }],
    genres: ['r&b', 'pop'],
    popularity: 97,
  },
];

const MOCK_TRACKS: SpotifyTrack[] = [
  {
    id: 'mock-track-1',
    name: 'One Dance',
    artists: [{ id: 'mock-artist-1', name: 'Drake' }],
    album: {
      id: 'mock-album-1',
      name: 'Views',
      images: [{ url: 'https://i.scdn.co/image/ab67616d0000b273f46b9d202509a8f7384b90de', height: 640, width: 640 }],
    },
    duration_ms: 173987,
    preview_url: null,
    uri: 'spotify:track:mock-1',
    popularity: 95,
  },
  {
    id: 'mock-track-2',
    name: 'Gods Plan',
    artists: [{ id: 'mock-artist-1', name: 'Drake' }],
    album: {
      id: 'mock-album-2',
      name: 'Scorpion',
      images: [{ url: 'https://i.scdn.co/image/ab67616d0000b273f907de96b9a4fbc04accc0d5', height: 640, width: 640 }],
    },
    duration_ms: 198973,
    preview_url: null,
    uri: 'spotify:track:mock-2',
    popularity: 93,
  },
  {
    id: 'mock-track-3',
    name: 'Hotline Bling',
    artists: [{ id: 'mock-artist-1', name: 'Drake' }],
    album: {
      id: 'mock-album-3',
      name: 'Views',
      images: [{ url: 'https://i.scdn.co/image/ab67616d0000b273f46b9d202509a8f7384b90de', height: 640, width: 640 }],
    },
    duration_ms: 267067,
    preview_url: null,
    uri: 'spotify:track:mock-3',
    popularity: 91,
  },
  {
    id: 'mock-track-4',
    name: 'In My Feelings',
    artists: [{ id: 'mock-artist-1', name: 'Drake' }],
    album: {
      id: 'mock-album-2',
      name: 'Scorpion',
      images: [{ url: 'https://i.scdn.co/image/ab67616d0000b273f907de96b9a4fbc04accc0d5', height: 640, width: 640 }],
    },
    duration_ms: 217925,
    preview_url: null,
    uri: 'spotify:track:mock-4',
    popularity: 89,
  },
  {
    id: 'mock-track-5',
    name: 'Nice For What',
    artists: [{ id: 'mock-artist-1', name: 'Drake' }],
    album: {
      id: 'mock-album-2',
      name: 'Scorpion',
      images: [{ url: 'https://i.scdn.co/image/ab67616d0000b273f907de96b9a4fbc04accc0d5', height: 640, width: 640 }],
    },
    duration_ms: 210747,
    preview_url: null,
    uri: 'spotify:track:mock-5',
    popularity: 88,
  },
  {
    id: 'mock-track-6',
    name: 'Passionfruit',
    artists: [{ id: 'mock-artist-1', name: 'Drake' }],
    album: {
      id: 'mock-album-4',
      name: 'More Life',
      images: [{ url: 'https://i.scdn.co/image/ab67616d0000b273c3b9c24c9d908b6a1405de84', height: 640, width: 640 }],
    },
    duration_ms: 298933,
    preview_url: null,
    uri: 'spotify:track:mock-6',
    popularity: 87,
  },
  {
    id: 'mock-track-7',
    name: 'Started From the Bottom',
    artists: [{ id: 'mock-artist-1', name: 'Drake' }],
    album: {
      id: 'mock-album-5',
      name: 'Nothing Was the Same',
      images: [{ url: 'https://i.scdn.co/image/ab67616d0000b273e43a3dcf7e4bbea5a1f06b9b', height: 640, width: 640 }],
    },
    duration_ms: 174600,
    preview_url: null,
    uri: 'spotify:track:mock-7',
    popularity: 86,
  },
  {
    id: 'mock-track-8',
    name: 'Hold On, Were Going Home',
    artists: [{ id: 'mock-artist-1', name: 'Drake' }],
    album: {
      id: 'mock-album-5',
      name: 'Nothing Was the Same',
      images: [{ url: 'https://i.scdn.co/image/ab67616d0000b273e43a3dcf7e4bbea5a1f06b9b', height: 640, width: 640 }],
    },
    duration_ms: 227733,
    preview_url: null,
    uri: 'spotify:track:mock-8',
    popularity: 85,
  },
  {
    id: 'mock-track-9',
    name: 'Energy',
    artists: [{ id: 'mock-artist-1', name: 'Drake' }],
    album: {
      id: 'mock-album-6',
      name: 'If Youre Reading This Its Too Late',
      images: [{ url: 'https://i.scdn.co/image/ab67616d0000b27386c1b95c5f8fd0d6bf8d7df1', height: 640, width: 640 }],
    },
    duration_ms: 188907,
    preview_url: null,
    uri: 'spotify:track:mock-9',
    popularity: 84,
  },
  {
    id: 'mock-track-10',
    name: 'Take Care',
    artists: [{ id: 'mock-artist-1', name: 'Drake' }],
    album: {
      id: 'mock-album-7',
      name: 'Take Care',
      images: [{ url: 'https://i.scdn.co/image/ab67616d0000b273e37be8e8c0e89bd3c3d33c32', height: 640, width: 640 }],
    },
    duration_ms: 270520,
    preview_url: null,
    uri: 'spotify:track:mock-10',
    popularity: 83,
  },
];

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
    // In dev mode, return a mock token
    if (DEV_MODE) {
      console.log('[DEV MODE] Returning mock access token');
      return 'mock-access-token-dev-mode';
    }

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
    // In dev mode, return mock artists
    if (DEV_MODE) {
      console.log(`[DEV MODE] Searching for artists: ${query}`);
      // Filter mock artists based on query
      const filtered = MOCK_ARTISTS.filter(artist => 
        artist.name.toLowerCase().includes(query.toLowerCase())
      );
      return filtered.length > 0 ? filtered : MOCK_ARTISTS;
    }

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
    // In dev mode, return mock tracks
    if (DEV_MODE) {
      console.log(`[DEV MODE] Getting top tracks for artist: ${artistId}`);
      return MOCK_TRACKS;
    }

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
    // In dev mode, return mock tracks matching the requested IDs
    if (DEV_MODE) {
      console.log(`[DEV MODE] Getting tracks by IDs: ${trackIds.join(', ')}`);
      const matchedTracks = MOCK_TRACKS.filter(track => trackIds.includes(track.id));
      return matchedTracks.length > 0 ? matchedTracks : MOCK_TRACKS.slice(0, trackIds.length);
    }

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
    // In dev mode, always return true
    if (DEV_MODE) {
      console.log('[DEV MODE] Authentication check - returning true');
      return true;
    }

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

