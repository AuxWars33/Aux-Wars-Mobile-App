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
  StatusBar,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
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
  currentround: number;
  decksize: number;
}

export default function VotingScreen() {
  const router = useRouter();
  const { sessionId, round } = useLocalSearchParams();
  const { user } = useAuth();

  const [session, setSession] = useState<Session | null>(null);
  const [playerDecks, setPlayerDecks] = useState<PlayerDeck[]>([]);
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [waitingForOthers, setWaitingForOthers] = useState(false);

  const currentRound = parseInt(round as string) || 0;

  useEffect(() => {
    if (!sessionId) {
      Alert.alert('Error', 'No session ID provided');
      router.back();
      return;
    }

    fetchVotingData();
    setupRealtimeSubscriptions();

    return () => {
      supabase.channel('voting').unsubscribe();
    };
  }, [sessionId]);

  const fetchVotingData = async () => {
    try {
      // Fetch session
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (sessionError) throw sessionError;
      setSession(sessionData);

      // Fetch player decks
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

      // Check if user already voted
      const { data: existingVote, error: voteError } = await supabase
        .from('votes')
        .select('*')
        .eq('sessionId', sessionId)
        .eq('round', currentRound)
        .eq('userId', user?.id)
        .maybeSingle();

      if (voteError && voteError.code !== 'PGRST116') {
        console.error('Error checking vote:', voteError);
      }

      if (existingVote) {
        setHasVoted(true);
        setWaitingForOthers(true);
      }

      setLoading(false);
    } catch (error: any) {
      console.error('Error fetching voting data:', error);
      Alert.alert('Error', 'Failed to load voting data. Please try again.');
      setLoading(false);
    }
  };

  const setupRealtimeSubscriptions = () => {
    supabase
      .channel('voting')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'votes',
          filter: `sessionId=eq.${sessionId}`,
        },
        (payload) => {
          console.log('New vote:', payload);
          checkIfAllVoted();
        }
      )
      .subscribe();
  };

  const checkIfAllVoted = async () => {
    try {
      // Get all votes for this round
      const { data: votes, error: votesError } = await supabase
        .from('votes')
        .select('userId')
        .eq('sessionId', sessionId)
        .eq('round', currentRound);

      if (votesError) throw votesError;

      // Get all participants
      const { data: participants, error: parError } = await supabase
        .from('session_participants')
        .select('userId')
        .eq('sessionId', sessionId);

      if (parError) throw parError;

      // If everyone voted, move to results
      if (votes && participants && votes.length === participants.length) {
        setTimeout(() => {
          router.push(`/session/round-results?sessionId=${sessionId}&round=${currentRound}`);
        }, 1000);
      }
    } catch (error) {
      console.error('Error checking votes:', error);
    }
  };

  const handleVote = async (trackId: string, ownerId: string) => {
    if (!user || !session) return;

    // Prevent self-voting
    if (ownerId === user.id) {
      Alert.alert('Cannot Vote', 'You cannot vote for your own track!');
      return;
    }

    if (hasVoted) {
      Alert.alert('Already Voted', 'You have already cast your vote for this round.');
      return;
    }

    setSelectedTrackId(trackId);

    Alert.alert(
      'Confirm Vote',
      'Are you sure you want to vote for this track?',
      [
        { text: 'Cancel', style: 'cancel', onPress: () => setSelectedTrackId(null) },
        {
          text: 'Vote',
          onPress: async () => {
            setSubmitting(true);
            try {
              // Submit vote
              const { error } = await supabase.from('votes').insert({
                sessionId: sessionId,
                round: currentRound,
                userId: user.id,
                trackId: trackId,
              });

              if (error) throw error;

              setHasVoted(true);
              setWaitingForOthers(true);

              Alert.alert('Vote Submitted!', 'Waiting for other players to vote...');
              
              // Check if all voted
              checkIfAllVoted();
            } catch (error) {
              console.error('Error submitting vote:', error);
              Alert.alert('Error', 'Failed to submit vote. Please try again.');
              setSelectedTrackId(null);
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
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
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (waitingForOthers) {
    return (
      <View style={styles.waitingContainer}>
        <LinearGradient
          colors={['#2D1B2E', '#8B4049']}
          style={styles.gradient}
        />
        <View style={styles.waitingContent}>
          <Ionicons name="checkmark-circle" size={80} color="#4CAF50" />
          <Text style={styles.waitingTitle}>Vote Submitted!</Text>
          <Text style={styles.waitingText}>
            Waiting for other players to vote...
          </Text>
          <ActivityIndicator
            size="large"
            color="#FFFBF5"
            style={styles.waitingSpinner}
          />
          
          {/* Skip to Results Button */}
          <TouchableOpacity
            style={styles.skipButton}
            onPress={() => router.push(`/session/round-results?sessionId=${sessionId}&round=${currentRound}`)}
          >
            <Text style={styles.skipButtonText}>View Results</Text>
            <Ionicons name="arrow-forward" size={20} color="#FFFBF5" />
          </TouchableOpacity>
          
          <Text style={styles.skipHint}>
            You can view results now or wait for everyone
          </Text>
        </View>
      </View>
    );
  }

  if (!session || playerDecks.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>No tracks to vote on</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <LinearGradient
        colors={['#2D1B2E', '#8B4049', '#2D1B2E']}
        style={styles.gradient}
      />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Vote for Your Favorite</Text>
        <Text style={styles.headerSubtitle}>
          Round {currentRound + 1} - Track {currentRound + 1}
        </Text>
      </View>

      {/* Voting Cards */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {playerDecks.map((deck) => {
          const track = deck.songs[currentRound];
          if (!track) return null;

          const isOwn = deck.userId === user?.id;
          const isSelected = selectedTrackId === track.id;

          return (
            <TouchableOpacity
              key={deck.id}
              style={[
                styles.voteCard,
                isOwn && styles.voteCardOwn,
                isSelected && styles.voteCardSelected,
              ]}
              onPress={() => handleVote(track.id, deck.userId)}
              disabled={isOwn || submitting}
              activeOpacity={0.8}
            >
              {/* Album Art */}
              <Image
                source={{ uri: track.album.images[0]?.url }}
                style={styles.voteCardImage}
              />

              {/* Track Info */}
              <View style={styles.voteCardInfo}>
                <Text style={styles.voteCardTrackName} numberOfLines={2}>
                  {track.name}
                </Text>
                <Text style={styles.voteCardArtist} numberOfLines={1}>
                  {track.artists.map(a => a.name).join(', ')}
                </Text>

                {/* Player Badge */}
                <View style={styles.playerBadge}>
                  <View style={styles.playerBadgeAvatar}>
                    <Text style={styles.playerBadgeText}>
                      {getDisplayName(deck).charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.playerBadgeName}>
                    {isOwn ? 'Your Track' : getDisplayName(deck)}
                  </Text>
                </View>
              </View>

              {/* Vote Button/Status */}
              <View style={styles.voteCardAction}>
                {isOwn ? (
                  <View style={styles.ownTrackBadge}>
                    <Ionicons name="person" size={20} color="#FFB800" />
                    <Text style={styles.ownTrackText}>Your Track</Text>
                  </View>
                ) : (
                  <View style={styles.voteButton}>
                    <Ionicons name="heart" size={24} color="#FFFBF5" />
                    <Text style={styles.voteButtonText}>Vote</Text>
                  </View>
                )}
              </View>

              {/* Selected Overlay */}
              {isSelected && (
                <View style={styles.selectedOverlay}>
                  <Ionicons name="checkmark-circle" size={48} color="#FFFBF5" />
                </View>
              )}
            </TouchableOpacity>
          );
        })}

        <View style={{ height: 40 }} />
      </ScrollView>
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
  waitingContainer: {
    flex: 1,
    backgroundColor: '#2D1B2E',
  },
  waitingContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  waitingTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFBF5',
    marginTop: 24,
    marginBottom: 12,
  },
  waitingText: {
    fontSize: 18,
    color: '#FFFBF5',
    opacity: 0.8,
    textAlign: 'center',
  },
  waitingSpinner: {
    marginTop: 32,
  },
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 251, 245, 0.2)',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    marginTop: 32,
    gap: 8,
    borderWidth: 2,
    borderColor: '#FFFBF5',
  },
  skipButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFBF5',
  },
  skipHint: {
    fontSize: 13,
    color: '#FFFBF5',
    opacity: 0.6,
    marginTop: 12,
    textAlign: 'center',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 24,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFBF5',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#FFFBF5',
    opacity: 0.7,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
  },
  voteCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 251, 245, 0.1)',
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'rgba(255, 251, 245, 0.2)',
    overflow: 'hidden',
  },
  voteCardOwn: {
    borderColor: '#FFB800',
    opacity: 0.6,
  },
  voteCardSelected: {
    borderColor: '#8B4049',
    backgroundColor: 'rgba(139, 64, 73, 0.3)',
  },
  voteCardImage: {
    width: 100,
    height: 100,
    borderRadius: 12,
    marginRight: 12,
  },
  voteCardInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  voteCardTrackName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFBF5',
    marginBottom: 4,
  },
  voteCardArtist: {
    fontSize: 14,
    color: '#FFFBF5',
    opacity: 0.7,
    marginBottom: 8,
  },
  playerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 64, 73, 0.5)',
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 8,
    alignSelf: 'flex-start',
  },
  playerBadgeAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#8B4049',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  playerBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#FFFBF5',
  },
  playerBadgeName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFBF5',
  },
  voteCardAction: {
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  voteButton: {
    backgroundColor: '#8B4049',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  voteButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFBF5',
    marginTop: 4,
  },
  ownTrackBadge: {
    alignItems: 'center',
    gap: 4,
  },
  ownTrackText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFB800',
  },
  selectedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(139, 64, 73, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
  },
});

