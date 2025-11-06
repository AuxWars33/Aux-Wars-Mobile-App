import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
  FlatList,
  StatusBar,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer, AudioSource } from 'expo-audio';
import SpotifyService, { SpotifyTrack } from '../../lib/spotifyService';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/AuthContext';

interface Session {
  id: string;
  name: string;
  code: string;
  hostId: string;
  artistid: string;
  artistname: string;
  artistimageurl: string;
  decksize: number;
  status: string;
}

export default function DeckBuilderScreen() {
  const router = useRouter();
  const { sessionId } = useLocalSearchParams();
  const { user } = useAuth();

  const [session, setSession] = useState<Session | null>(null);
  const [tracks, setTracks] = useState<SpotifyTrack[]>([]);
  const [selectedTracks, setSelectedTracks] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [playingTrack, setPlayingTrack] = useState<string | null>(null);
  
  const player = useAudioPlayer();

  useEffect(() => {
    if (!sessionId) {
      Alert.alert('Error', 'No session ID provided');
      router.back();
      return;
    }

    fetchSessionAndTracks();

    // Cleanup audio player on unmount
    return () => {
      try {
        player.pause();
      } catch (err) {
        // Player may already be cleaned up
        console.log('Audio player cleanup:', err);
      }
    };
  }, [sessionId]);

  const fetchSessionAndTracks = async () => {
    try {
      // Fetch session details
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (sessionError) throw sessionError;
      setSession(sessionData);

      // Check if user already submitted a deck
      const { data: existingDeck, error: deckError } = await supabase
        .from('player_decks')
        .select('*')
        .eq('sessionId', sessionId)
        .eq('userId', user?.id)
        .maybeSingle();

      if (deckError) {
        console.error('Error checking existing deck:', deckError);
      }

      if (existingDeck && existingDeck.isSubmitted) {
        Alert.alert(
          'Deck Already Submitted',
          'You have already submitted your deck for this session.',
          [{ text: 'OK', onPress: () => router.push(`/session/lobby?sessionId=${sessionId}`) }]
        );
        return;
      }

      // Fetch artist's top tracks from Spotify
      const artistTracks = await SpotifyService.getArtistTopTracks(
        sessionData.artistid
      );
      setTracks(artistTracks);

      // If there's an existing draft deck, restore selections
      if (existingDeck && existingDeck.songs) {
        const savedTrackIds = existingDeck.songs.map((t: any) => t.id);
        setSelectedTracks(new Set(savedTrackIds));
      }
    } catch (error) {
      console.error('Error fetching session/tracks:', error);
      Alert.alert('Error', 'Failed to load tracks. Please try again.');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleTrackSelect = (trackId: string) => {
    const newSelected = new Set(selectedTracks);
    
    if (newSelected.has(trackId)) {
      newSelected.delete(trackId);
    } else {
      if (session && newSelected.size >= session.decksize) {
        Alert.alert(
          'Maximum Reached',
          `You can only select ${session.decksize} songs for your deck.`
        );
        return;
      }
      newSelected.add(trackId);
    }
    
    setSelectedTracks(newSelected);
  };

  const handlePlayPreview = async (track: SpotifyTrack) => {
    try {
      // If clicking the same track, just stop
      if (playingTrack === track.id) {
        player.pause();
        setPlayingTrack(null);
        return;
      }

      // Check if preview URL exists
      if (!track.preview_url) {
        console.log('No preview URL for track:', track.name);
        Alert.alert('Preview Unavailable', 'No preview available for this track.');
        return;
      }

      console.log('Playing preview for:', track.name, 'URL:', track.preview_url);

      // Replace the current audio source and play
      player.replace({ uri: track.preview_url } as AudioSource);
      player.play();
      player.volume = 0.5;
      
      setPlayingTrack(track.id);

      // Stop after 30 seconds
      setTimeout(() => {
        try {
          if (playingTrack === track.id) {
            player.pause();
            setPlayingTrack(null);
          }
        } catch (err) {
          console.error('Error stopping preview:', err);
        }
      }, 30000);
    } catch (error) {
      console.error('Error playing preview:', error);
      setPlayingTrack(null);
      Alert.alert('Error', 'Failed to play preview. Please try again.');
    }
  };

  const handleSubmitDeck = async () => {
    if (!session || !user) return;

    if (selectedTracks.size !== session.decksize) {
      Alert.alert(
        'Incomplete Deck',
        `Please select exactly ${session.decksize} songs for your deck.`
      );
      return;
    }

    Alert.alert(
      'Submit Deck?',
      `Submit your deck with ${selectedTracks.size} songs? You won't be able to change it after submission.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          onPress: async () => {
            setSubmitting(true);
            try {
              // Get full track data for selected tracks
              const selectedTrackData = tracks.filter(track =>
                selectedTracks.has(track.id)
              );

              // Save deck to database
              const { error } = await supabase
                .from('player_decks')
                .upsert({
                  sessionId: sessionId,
                  userId: user.id,
                  songs: selectedTrackData,
                  isSubmitted: true,
                }, { onConflict: 'sessionId,userId' });

              if (error) throw error;

              Alert.alert(
                'Success!',
                'Your deck has been submitted. Waiting for other players...',
                [
                  {
                    text: 'OK',
                    onPress: () => router.push(`/session/lobby?sessionId=${sessionId}`),
                  },
                ]
              );
            } catch (error) {
              console.error('Error submitting deck:', error);
              Alert.alert('Error', 'Failed to submit deck. Please try again.');
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  const handleSaveDraft = async () => {
    if (!session || !user || selectedTracks.size === 0) return;

    try {
      const selectedTrackData = tracks.filter(track =>
        selectedTracks.has(track.id)
      );

      await supabase
        .from('player_decks')
        .upsert({
          sessionId: sessionId,
          userId: user.id,
          songs: selectedTrackData,
          isSubmitted: false,
        }, { onConflict: 'sessionId,userId' });

      Alert.alert('Draft Saved', 'Your deck selections have been saved.');
    } catch (error) {
      console.error('Error saving draft:', error);
      Alert.alert('Error', 'Failed to save draft.');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8B4049" />
        <Text style={styles.loadingText}>Loading tracks...</Text>
      </View>
    );
  }

  if (!session) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Session not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={28} color="#2D1B2E" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Build Your Deck</Text>
          <Text style={styles.headerSubtitle}>
            {selectedTracks.size}/{session.decksize} selected
          </Text>
        </View>
        <TouchableOpacity style={styles.saveButton} onPress={handleSaveDraft}>
          <Ionicons name="save-outline" size={24} color="#8B4049" />
        </TouchableOpacity>
      </View>

      {/* Artist Info */}
      <View style={styles.artistBanner}>
        {session.artistimageurl && (
          <Image
            source={{ uri: session.artistimageurl }}
            style={styles.artistImage}
          />
        )}
        <View style={styles.artistInfo}>
          <Text style={styles.artistName}>{session.artistname}</Text>
          <Text style={styles.artistSubtext}>
            Select {session.decksize} tracks for your deck
          </Text>
        </View>
      </View>

      {/* Track List */}
      <FlatList
        data={tracks}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.trackList}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => {
          const isSelected = selectedTracks.has(item.id);
          const isPlaying = playingTrack === item.id;

          return (
            <TouchableOpacity
              style={[styles.trackItem, isSelected && styles.trackItemSelected]}
              onPress={() => handleTrackSelect(item.id)}
              activeOpacity={0.7}
            >
              {/* Album Art */}
              <View style={styles.trackLeft}>
                <View style={[styles.trackImageContainer, isSelected && styles.trackImageSelected]}>
                  <Image
                    source={{ uri: item.album.images[0]?.url }}
                    style={styles.trackImage}
                  />
                  {isSelected && (
                    <View style={styles.selectedOverlay}>
                      <Ionicons name="checkmark-circle" size={32} color="#FFFBF5" />
                    </View>
                  )}
                </View>

                {/* Track Info */}
                <View style={styles.trackInfo}>
                  <Text style={styles.trackName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.trackArtist} numberOfLines={1}>
                    {item.artists.map(a => a.name).join(', ')}
                  </Text>
                  <Text style={styles.trackDuration}>
                    {Math.floor(item.duration_ms / 60000)}:
                    {String(Math.floor((item.duration_ms % 60000) / 1000)).padStart(2, '0')}
                  </Text>
                </View>
              </View>

              {/* Play Button */}
              <TouchableOpacity
                style={styles.playButton}
                onPress={() => handlePlayPreview(item)}
              >
                <Ionicons
                  name={isPlaying ? 'stop-circle' : 'play-circle'}
                  size={36}
                  color={isPlaying ? '#8B4049' : '#A5545F'}
                />
              </TouchableOpacity>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="musical-notes-outline" size={64} color="#CCC" />
            <Text style={styles.emptyText}>No tracks found</Text>
          </View>
        }
      />

      {/* Submit Button */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity
          style={[
            styles.submitButton,
            (selectedTracks.size !== session.decksize || submitting) &&
              styles.submitButtonDisabled,
          ]}
          onPress={handleSubmitDeck}
          disabled={selectedTracks.size !== session.decksize || submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFBF5" />
          ) : (
            <>
              <Text style={styles.submitButtonText}>Submit Deck</Text>
              <Ionicons name="checkmark" size={20} color="#FFFBF5" />
            </>
          )}
        </TouchableOpacity>
        {selectedTracks.size !== session.decksize && (
          <Text style={styles.submitHint}>
            Select {session.decksize - selectedTracks.size} more{' '}
            {session.decksize - selectedTracks.size === 1 ? 'track' : 'tracks'}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF9F0',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF9F0',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#8B4049',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 16,
  },
  backButton: {
    padding: 8,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D1B2E',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#8B4049',
    fontWeight: '600',
    marginTop: 2,
  },
  saveButton: {
    padding: 8,
  },
  artistBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBF5',
    marginHorizontal: 24,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#E8D5C4',
  },
  artistImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 12,
  },
  artistInfo: {
    flex: 1,
  },
  artistName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D1B2E',
    marginBottom: 4,
  },
  artistSubtext: {
    fontSize: 14,
    color: '#666',
  },
  trackList: {
    paddingHorizontal: 24,
    paddingBottom: 120,
  },
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFBF5',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#E8D5C4',
  },
  trackItemSelected: {
    borderColor: '#8B4049',
    backgroundColor: '#FFF3F0',
  },
  trackLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  trackImageContainer: {
    position: 'relative',
    marginRight: 12,
  },
  trackImageSelected: {
    opacity: 0.8,
  },
  trackImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  selectedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(139, 64, 73, 0.7)',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trackInfo: {
    flex: 1,
    marginRight: 8,
  },
  trackName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D1B2E',
    marginBottom: 4,
  },
  trackArtist: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  trackDuration: {
    fontSize: 12,
    color: '#999',
  },
  playButton: {
    padding: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#999',
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    paddingBottom: 40,
    backgroundColor: '#FFF9F0',
    borderTopWidth: 1,
    borderTopColor: '#E8D5C4',
  },
  submitButton: {
    backgroundColor: '#8B4049',
    borderRadius: 12,
    height: 56,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#2D1B2E',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFBF5',
  },
  submitHint: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
});

