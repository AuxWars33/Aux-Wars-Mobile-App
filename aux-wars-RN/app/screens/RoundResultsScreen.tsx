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
  Animated,
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

interface VoteResult {
  trackId: string;
  track: Track;
  ownerId: string;
  ownerName: string;
  votes: number;
  voters: string[];
}

interface Session {
  id: string;
  name: string;
  currentround: number;
  decksize: number;
}

export default function RoundResultsScreen() {
  const router = useRouter();
  const { sessionId, round } = useLocalSearchParams();
  const { user } = useAuth();

  const [session, setSession] = useState<Session | null>(null);
  const [results, setResults] = useState<VoteResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [proceeding, setProceeding] = useState(false);

  const currentRound = parseInt(round as string) || 0;
  const scaleAnim = new Animated.Value(0);

  useEffect(() => {
    if (!sessionId) {
      Alert.alert('Error', 'No session ID provided');
      router.back();
      return;
    }

    fetchResults();

    // Animate trophy
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();
  }, [sessionId]);

  const fetchResults = async () => {
    try {
      // Fetch session
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (sessionError) throw sessionError;
      setSession(sessionData);

      // Fetch votes for this round
      const { data: votesData, error: votesError } = await supabase
        .from('votes')
        .select('*')
        .eq('sessionId', sessionId)
        .eq('round', currentRound);

      if (votesError) throw votesError;

      // Fetch player decks to get track info
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
        .eq('sessionId', sessionId);

      if (decksError) throw decksError;

      // Calculate results
      const voteMap: { [trackId: string]: VoteResult } = {};

      // Initialize with all tracks
      decksData.forEach((deck: any) => {
        const track = deck.songs[currentRound];
        if (track) {
          voteMap[track.id] = {
            trackId: track.id,
            track: track,
            ownerId: deck.userId,
            ownerName: deck.user?.username || deck.user?.email?.split('@')[0] || 'Player',
            votes: 0,
            voters: [],
          };
        }
      });

      // Count votes
      votesData.forEach((vote: any) => {
        if (voteMap[vote.trackId]) {
          voteMap[vote.trackId].votes += 1;
          voteMap[vote.trackId].voters.push(vote.userId);
        }
      });

      // Sort by votes (descending)
      const sortedResults = Object.values(voteMap).sort((a, b) => b.votes - a.votes);
      setResults(sortedResults);

      // Update participant scores
      if (sortedResults.length > 0) {
        const winner = sortedResults[0];
        await updateParticipantScore(winner.ownerId, winner.votes);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching results:', error);
      Alert.alert('Error', 'Failed to load results. Please try again.');
      setLoading(false);
    }
  };

  const updateParticipantScore = async (userId: string, points: number) => {
    try {
      // Get current score
      const { data: participant, error: fetchError } = await supabase
        .from('session_participants')
        .select('score')
        .eq('sessionId', sessionId)
        .eq('userId', userId)
        .single();

      if (fetchError) throw fetchError;

      // Update score
      const newScore = (participant?.score || 0) + points;
      const { error: updateError } = await supabase
        .from('session_participants')
        .update({ score: newScore })
        .eq('sessionId', sessionId)
        .eq('userId', userId);

      if (updateError) throw updateError;
    } catch (error) {
      console.error('Error updating score:', error);
    }
  };

  const handleNextRound = async () => {
    if (!session) return;

    setProceeding(true);

    try {
      // Check if there are more tracks to play
      if (currentRound < session.decksize - 1) {
        // Update session to next round
        await supabase
          .from('sessions')
          .update({ 
            currentround: currentRound + 1,
            updatedAt: new Date().toISOString(),
          })
          .eq('id', sessionId);

        // Go to next round
        Alert.alert(
          'Next Round!',
          `Prepare for round ${currentRound + 2}`,
          [
            {
              text: 'Start',
              onPress: () => router.push(`/session/round?sessionId=${sessionId}`),
            },
          ]
        );
      } else {
        // All rounds complete, go to final leaderboard
        await supabase
          .from('sessions')
          .update({ 
            status: 'completed',
            updatedAt: new Date().toISOString(),
          })
          .eq('id', sessionId);

        Alert.alert(
          'Game Complete!',
          'All rounds finished. See who won the aux!',
          [
            {
              text: 'View Results',
              onPress: () => router.push(`/session/leaderboard?sessionId=${sessionId}`),
            },
          ]
        );
      }
    } catch (error) {
      console.error('Error proceeding:', error);
      Alert.alert('Error', 'Failed to proceed. Please try again.');
      setProceeding(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8B4049" />
        <Text style={styles.loadingText}>Calculating results...</Text>
      </View>
    );
  }

  if (!session || results.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>No results found</Text>
      </View>
    );
  }

  const winner = results[0];
  const isWinner = winner.ownerId === user?.id;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <LinearGradient
        colors={['#2D1B2E', '#8B4049', '#2D1B2E']}
        style={styles.gradient}
      />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Round {currentRound + 1} Results</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Winner Card */}
        <View style={styles.winnerCard}>
          <Animated.View style={[styles.trophy, { transform: [{ scale: scaleAnim }] }]}>
            <Ionicons name="trophy" size={60} color="#FFB800" />
          </Animated.View>
          
          <Text style={styles.winnerTitle}>Round Winner!</Text>
          
          <Image
            source={{ uri: winner.track.album.images[0]?.url }}
            style={styles.winnerImage}
          />
          
          <Text style={styles.winnerTrackName}>{winner.track.name}</Text>
          <Text style={styles.winnerArtist}>
            {winner.track.artists.map(a => a.name).join(', ')}
          </Text>
          
          <View style={styles.winnerPlayerBadge}>
            <Text style={styles.winnerPlayerName}>
              {isWinner ? '🎉 You Won! 🎉' : `${winner.ownerName} Won!`}
            </Text>
          </View>
          
          <View style={styles.winnerVotes}>
            <Ionicons name="heart" size={20} color="#FF6B6B" />
            <Text style={styles.winnerVotesText}>
              {winner.votes} {winner.votes === 1 ? 'vote' : 'votes'}
            </Text>
          </View>
        </View>

        {/* All Results */}
        <View style={styles.resultsContainer}>
          <Text style={styles.resultsTitle}>All Tracks</Text>
          
          {results.map((result, index) => {
            const isOwn = result.ownerId === user?.id;
            const position = index + 1;
            
            return (
              <View
                key={result.trackId}
                style={[
                  styles.resultCard,
                  index === 0 && styles.resultCardWinner,
                  isOwn && styles.resultCardOwn,
                ]}
              >
                {/* Position */}
                <View style={styles.resultPosition}>
                  {index === 0 ? (
                    <Ionicons name="trophy" size={24} color="#FFB800" />
                  ) : (
                    <Text style={styles.resultPositionText}>{position}</Text>
                  )}
                </View>

                {/* Track Info */}
                <Image
                  source={{ uri: result.track.album.images[0]?.url }}
                  style={styles.resultImage}
                />
                
                <View style={styles.resultInfo}>
                  <Text style={styles.resultTrackName} numberOfLines={1}>
                    {result.track.name}
                  </Text>
                  <Text style={styles.resultOwner} numberOfLines={1}>
                    {isOwn ? 'Your Track' : result.ownerName}
                  </Text>
                </View>

                {/* Votes */}
                <View style={styles.resultVotes}>
                  <Ionicons name="heart" size={18} color="#FF6B6B" />
                  <Text style={styles.resultVotesText}>{result.votes}</Text>
                </View>
              </View>
            );
          })}
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Continue Button */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity
          style={[styles.continueButton, proceeding && styles.continueButtonDisabled]}
          onPress={handleNextRound}
          disabled={proceeding}
        >
          {proceeding ? (
            <ActivityIndicator color="#FFFBF5" />
          ) : (
            <>
              <Text style={styles.continueButtonText}>
                {currentRound < session.decksize - 1 ? 'Next Round' : 'View Final Results'}
              </Text>
              <Ionicons name="arrow-forward" size={20} color="#FFFBF5" />
            </>
          )}
        </TouchableOpacity>
        
        {/* Skip to Leaderboard Button (only show if not last round) */}
        {currentRound < session.decksize - 1 && (
          <TouchableOpacity
            style={styles.skipToLeaderboardButton}
            onPress={() => router.push(`/session/leaderboard?sessionId=${sessionId}`)}
            disabled={proceeding}
          >
            <Text style={styles.skipToLeaderboardText}>Skip to Final Leaderboard</Text>
          </TouchableOpacity>
        )}
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
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFBF5',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
  },
  winnerCard: {
    backgroundColor: 'rgba(255, 251, 245, 0.1)',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#FFB800',
  },
  trophy: {
    marginBottom: 16,
  },
  winnerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFB800',
    marginBottom: 20,
  },
  winnerImage: {
    width: 200,
    height: 200,
    borderRadius: 16,
    marginBottom: 16,
  },
  winnerTrackName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFBF5',
    textAlign: 'center',
    marginBottom: 8,
  },
  winnerArtist: {
    fontSize: 16,
    color: '#FFFBF5',
    opacity: 0.7,
    textAlign: 'center',
    marginBottom: 16,
  },
  winnerPlayerBadge: {
    backgroundColor: 'rgba(139, 64, 73, 0.8)',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  winnerPlayerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFBF5',
  },
  winnerVotes: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  winnerVotesText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFBF5',
  },
  resultsContainer: {
    marginBottom: 24,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFBF5',
    marginBottom: 16,
  },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 251, 245, 0.05)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 251, 245, 0.1)',
  },
  resultCardWinner: {
    borderColor: '#FFB800',
    backgroundColor: 'rgba(255, 184, 0, 0.1)',
  },
  resultCardOwn: {
    borderColor: '#8B4049',
  },
  resultPosition: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  resultPositionText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFBF5',
  },
  resultImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  resultInfo: {
    flex: 1,
    marginRight: 12,
  },
  resultTrackName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFBF5',
    marginBottom: 4,
  },
  resultOwner: {
    fontSize: 14,
    color: '#FFFBF5',
    opacity: 0.6,
  },
  resultVotes: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 107, 107, 0.2)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  resultVotesText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFBF5',
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    paddingBottom: 40,
    backgroundColor: 'rgba(45, 27, 46, 0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 251, 245, 0.1)',
  },
  continueButton: {
    backgroundColor: '#8B4049',
    borderRadius: 12,
    height: 56,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  continueButtonDisabled: {
    opacity: 0.5,
  },
  continueButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFBF5',
  },
  skipToLeaderboardButton: {
    backgroundColor: 'transparent',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 12,
    alignItems: 'center',
  },
  skipToLeaderboardText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFBF5',
    opacity: 0.7,
  },
});

