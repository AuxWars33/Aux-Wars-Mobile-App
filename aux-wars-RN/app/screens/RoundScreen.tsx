import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  Animated,
  StatusBar,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer, AudioSource } from 'expo-audio';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/AuthContext';

interface Track {
  id: string;
  name: string;
  artists: { name: string }[];
  album: {
    images: { url: string }[];
  };
  preview_url: string | null;
  duration_ms: number;
}

interface PlayerDeck {
  id: string;
  userId: string;
  songs: Track[];
  user?: {
    username?: string;
    email?: string;
  };
}

interface Session {
  id: string;
  name: string;
  decksize: number;
  currentround: number;
  artistname: string;
}

export default function RoundScreen() {
  const router = useRouter();
  const { sessionId } = useLocalSearchParams();
  const { user } = useAuth();

  const [session, setSession] = useState<Session | null>(null);
  const [playerDecks, setPlayerDecks] = useState<PlayerDeck[]>([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  
  const player = useAudioPlayer();
  const progressAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const timerRef = useRef<number | null>(null);
  const autoAdvanceRef = useRef<number | null>(null);

  useEffect(() => {
    if (!sessionId) {
      Alert.alert('Error', 'No session ID provided');
      router.back();
      return;
    }

    fetchRoundData();

    return () => {
      try {
        player.pause();
      } catch (err) {
        // Player may already be cleaned up
        console.log('Audio player cleanup:', err);
      }
      if (timerRef.current) clearInterval(timerRef.current);
      if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
    };
  }, [sessionId]);

  useEffect(() => {
    if (playerDecks.length > 0 && !loading) {
      playCurrentTrack();
    }
  }, [currentTrackIndex, currentPlayerIndex, playerDecks]);

  const fetchRoundData = async () => {
    try {
      // Fetch session
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (sessionError) throw sessionError;
      setSession(sessionData);

      // Fetch all player decks with user info
      const { data: decksData, error: decksError } = await supabase
        .from('player_decks')
        .select(`
          *,
          user:users (
            id,
            email,
            username
          )
        `)
        .eq('sessionId', sessionId)
        .eq('isSubmitted', true);

      if (decksError) throw decksError;
      setPlayerDecks(decksData || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching round data:', error);
      Alert.alert('Error', 'Failed to load round data. Please try again.');
      router.back();
    }
  };

  const playCurrentTrack = async () => {
    try {
      // Clear any existing timers
      if (timerRef.current) clearInterval(timerRef.current);
      if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);

      const currentDeck = playerDecks[currentPlayerIndex];
      const currentTrack = currentDeck.songs[currentTrackIndex];

      if (!currentTrack.preview_url) {
        Alert.alert(
          'Preview Unavailable',
          'No preview available for this track. Skipping...',
          [{ text: 'OK', onPress: handleNextTrack }]
        );
        return;
      }

      // Animate album art
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      // Load and play track
      player.replace({ uri: currentTrack.preview_url } as AudioSource);
      player.play();
      player.volume = 0.7;

      setPlaying(true);
      setProgress(0);
      setTimeLeft(30);

      // Reset progress animation
      progressAnim.setValue(0);

      // Animate progress bar
      Animated.timing(progressAnim, {
        toValue: 100,
        duration: 30000,
        useNativeDriver: false,
      }).start();

      // Update timer
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Auto advance after 30 seconds
      autoAdvanceRef.current = setTimeout(() => {
        if (timerRef.current) clearInterval(timerRef.current);
        player.pause();
        setPlaying(false);
        handleNextTrack();
      }, 30000);
    } catch (error) {
      console.error('Error playing track:', error);
      Alert.alert('Error', 'Failed to play track. Skipping...');
      handleNextTrack();
    }
  };

  const handleNextTrack = () => {
    if (!session) return;

    // Check if we need to move to next player
    if (currentPlayerIndex < playerDecks.length - 1) {
      setCurrentPlayerIndex(prev => prev + 1);
    } else {
      // All players done for this round, check if more tracks
      if (currentTrackIndex < session.decksize - 1) {
        // Next track, reset to first player
        setCurrentTrackIndex(prev => prev + 1);
        setCurrentPlayerIndex(0);
      } else {
        // All tracks done, move to voting
        handleRoundComplete();
      }
    }
  };

  const handleRoundComplete = async () => {
    try {
      if (!session) return;

      Alert.alert(
        'Round Complete!',
        'Time to vote for your favorite track!',
        [
          {
            text: 'Start Voting',
            onPress: () => {
              router.push(
                `/session/voting?sessionId=${sessionId}&round=${session.currentround}`
              );
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error completing round:', error);
      Alert.alert('Error', 'Failed to complete round.');
    }
  };

  const handlePauseResume = async () => {
    try {
      if (playing) {
        player.pause();
        setPlaying(false);
      } else {
        player.play();
        setPlaying(true);
      }
    } catch (error) {
      console.error('Error pausing/resuming:', error);
    }
  };

  const getDisplayName = (deck: PlayerDeck) => {
    if (deck.user?.username) return deck.user.username;
    if (deck.user?.email) return deck.user.email.split('@')[0];
    return 'Player';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8B4049" />
        <Text style={styles.loadingText}>Loading round...</Text>
      </View>
    );
  }

  if (playerDecks.length === 0 || !session) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>No decks found</Text>
      </View>
    );
  }

  const currentDeck = playerDecks[currentPlayerIndex];
  const currentTrack = currentDeck.songs[currentTrackIndex];
  const isCurrentUser = currentDeck.userId === user?.id;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Background Gradient */}
      <LinearGradient
        colors={['#2D1B2E', '#8B4049', '#2D1B2E']}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.roundText}>
          Track {currentTrackIndex + 1} of {session.decksize}
        </Text>
        <Text style={styles.artistText}>{session.artistname} Battle</Text>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {/* Album Art */}
        <Animated.View
          style={[
            styles.albumArtContainer,
            { transform: [{ scale: scaleAnim }] },
          ]}
        >
          <Image
            source={{ uri: currentTrack.album.images[0]?.url }}
            style={styles.albumArt}
          />
          <View style={styles.albumOverlay}>
            {playing && (
              <View style={styles.playingIndicator}>
                <Ionicons name="musical-notes" size={40} color="#FFFBF5" />
              </View>
            )}
          </View>
        </Animated.View>

        {/* Track Info */}
        <View style={styles.trackInfo}>
          <Text style={styles.trackName}>{currentTrack.name}</Text>
          <Text style={styles.trackArtist}>
            {currentTrack.artists.map(a => a.name).join(', ')}
          </Text>
        </View>

        {/* Player Info */}
        <View style={styles.playerInfo}>
          <View style={styles.playerAvatar}>
            <Text style={styles.playerAvatarText}>
              {getDisplayName(currentDeck).charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.playerDetails}>
            <Text style={styles.playerName}>{getDisplayName(currentDeck)}</Text>
            {isCurrentUser && (
              <View style={styles.yourTrackBadge}>
                <Text style={styles.yourTrackText}>Your Track</Text>
              </View>
            )}
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  width: progressAnim.interpolate({
                    inputRange: [0, 100],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </View>
          <Text style={styles.timeText}>{timeLeft}s</Text>
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={handlePauseResume}
          >
            <Ionicons
              name={playing ? 'pause' : 'play'}
              size={32}
              color="#FFFBF5"
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.controlButton, styles.skipButton]}
            onPress={handleNextTrack}
          >
            <Ionicons name="play-skip-forward" size={28} color="#FFFBF5" />
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        </View>

        {/* Player Queue */}
        <View style={styles.queueContainer}>
          <Text style={styles.queueTitle}>Up Next</Text>
          <View style={styles.queueList}>
            {playerDecks.map((deck, index) => (
              <View
                key={deck.id}
                style={[
                  styles.queueItem,
                  index === currentPlayerIndex && styles.queueItemActive,
                  index < currentPlayerIndex && styles.queueItemDone,
                ]}
              >
                <View style={styles.queueAvatar}>
                  <Text style={styles.queueAvatarText}>
                    {getDisplayName(deck).charAt(0).toUpperCase()}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.queueName,
                    index === currentPlayerIndex && styles.queueNameActive,
                    index < currentPlayerIndex && styles.queueNameDone,
                  ]}
                  numberOfLines={1}
                >
                  {getDisplayName(deck)}
                </Text>
                {index === currentPlayerIndex && (
                  <Ionicons name="musical-note" size={16} color="#FFFBF5" />
                )}
                {index < currentPlayerIndex && (
                  <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                )}
              </View>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2D1B2E',
  },
  gradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2D1B2E',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#FFFBF5',
  },
  errorText: {
    fontSize: 16,
    color: '#FF6B6B',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 20,
    alignItems: 'center',
  },
  roundText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFBF5',
    opacity: 0.8,
  },
  artistText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFBF5',
    marginTop: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  albumArtContainer: {
    width: 280,
    height: 280,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  albumArt: {
    width: '100%',
    height: '100%',
  },
  albumOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playingIndicator: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(139, 64, 73, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  trackInfo: {
    alignItems: 'center',
    marginBottom: 20,
  },
  trackName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFBF5',
    textAlign: 'center',
    marginBottom: 8,
  },
  trackArtist: {
    fontSize: 18,
    color: '#FFFBF5',
    opacity: 0.7,
    textAlign: 'center',
  },
  playerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 251, 245, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 24,
  },
  playerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#8B4049',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  playerAvatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFBF5',
  },
  playerDetails: {
    flex: 1,
  },
  playerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFBF5',
  },
  yourTrackBadge: {
    backgroundColor: '#FFB800',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  yourTrackText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#2D1B2E',
  },
  progressContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(255, 251, 245, 0.2)',
    borderRadius: 3,
    overflow: 'hidden',
    marginRight: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFFBF5',
    borderRadius: 3,
  },
  timeText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFBF5',
    minWidth: 40,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 32,
  },
  controlButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(139, 64, 73, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  skipButton: {
    width: 'auto',
    paddingHorizontal: 20,
    flexDirection: 'row',
    gap: 8,
  },
  skipText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFBF5',
  },
  queueContainer: {
    width: '100%',
  },
  queueTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFBF5',
    opacity: 0.7,
    marginBottom: 12,
  },
  queueList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  queueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 251, 245, 0.1)',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    gap: 8,
  },
  queueItemActive: {
    backgroundColor: 'rgba(139, 64, 73, 0.9)',
  },
  queueItemDone: {
    opacity: 0.5,
  },
  queueAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#8B4049',
    justifyContent: 'center',
    alignItems: 'center',
  },
  queueAvatarText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFBF5',
  },
  queueName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFBF5',
    maxWidth: 80,
  },
  queueNameActive: {
    fontWeight: 'bold',
  },
  queueNameDone: {
    textDecorationLine: 'line-through',
  },
});

