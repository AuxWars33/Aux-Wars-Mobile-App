require('dotenv').config();
const express = require('express');
const axios = require('axios');
const router = express.Router();

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';

/**
 * POST /api/spotify/token
 * Exchange authorization code for access token
 */
router.post('/token', async (req, res) => {
  try {
    const { code, redirect_uri } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Authorization code is required' });
    }

    // Exchange code for tokens
    const response = await axios.post(
      SPOTIFY_TOKEN_URL,
      new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri,
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(
            `${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`
          ).toString('base64')}`,
        },
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error('Spotify token exchange error:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Failed to exchange token',
      details: error.response?.data || error.message,
    });
  }
});

/**
 * POST /api/spotify/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', async (req, res) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }

    // Request new access token
    const response = await axios.post(
      SPOTIFY_TOKEN_URL,
      new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token,
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(
            `${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`
          ).toString('base64')}`,
        },
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error('Spotify token refresh error:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Failed to refresh token',
      details: error.response?.data || error.message,
    });
  }
});

/**
 * GET /api/spotify/search/artist
 * Search for artists (proxied to avoid CORS issues)
 */
router.get('/search/artist', async (req, res) => {
  try {
    const { q, access_token } = req.query;

    if (!q || !access_token) {
      return res.status(400).json({ error: 'Query and access token are required' });
    }

    const response = await axios.get('https://api.spotify.com/v1/search', {
      params: {
        q,
        type: 'artist',
        limit: 10,
      },
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    res.json(response.data);
  } catch (error) {
    console.error('Spotify artist search error:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Failed to search artists',
      details: error.response?.data || error.message,
    });
  }
});

/**
 * GET /api/spotify/artist/:id/tracks
 * Get artist's top tracks
 */
router.get('/artist/:id/tracks', async (req, res) => {
  try {
    const { id } = req.params;
    const { access_token } = req.query;

    if (!access_token) {
      return res.status(400).json({ error: 'Access token is required' });
    }

    const response = await axios.get(
      `https://api.spotify.com/v1/artists/${id}/top-tracks`,
      {
        params: { market: 'US' },
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error('Spotify get tracks error:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Failed to get artist tracks',
      details: error.response?.data || error.message,
    });
  }
});

module.exports = router;

