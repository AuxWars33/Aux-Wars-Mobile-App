import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Animated,
  StatusBar,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import ConfettiCannon from 'react-native-confetti-cannon';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/AuthContext';

interface Participant {
  userId: string;
  score: number;
  isHost: boolean;
  user?: {
    id: string;
    email: string;
    username?: string;
  };
}

interface Session {
  id: string;
  name: string;
  artistname: string;
  decksize: number;
}

export default function LeaderboardScreen() {
  const router = useRouter();
  const { sessionId } = useLocalSearchParams();
  const { user } = useAuth();

  const [session, setSession] = useState<Session | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showConfetti, setShowConfetti] = useState(false);

  const scaleAnim = new Animated.Value(0);

  useEffect(() => {
    if (!sessionId) {
      Alert.alert('Error', 'No session ID provided');
      router.back();
      return;
    }

    fetchLeaderboard();

    // Animate trophy
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();

    // Show confetti after a short delay
    setTimeout(() => {
      setShowConfetti(true);
    }, 500);
  }, [sessionId]);

  const fetchLeaderboard = async () => {
    try {
      // Fetch session
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (sessionError) throw sessionError;
      setSession(sessionData);

      // Fetch participants with scores
      const { data: participantsData, error: parError } = await supabase
        .from('session_participants')
        .select(`
          *,
          user:users (
            id,
            email,
            username
          )
        `)
        .eq('sessionId', sessionId)
        .order('score', { ascending: false });

      if (parError) throw parError;
      setParticipants(participantsData || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      Alert.alert('Error', 'Failed to load leaderboard. Please try again.');
      setLoading(false);
    }
  };

  const handleReturnHome = () => {
    Alert.alert(
      'Leave Session?',
      'Return to home screen?',
      [
        { text: 'Stay', style: 'cancel' },
        {
          text: 'Leave',
          onPress: () => {
            router.push('/(tabs)');
          },
        },
      ]
    );
  };

  const getDisplayName = (participant: Participant) => {
    if (participant.user?.username) return participant.user.username;
    if (participant.user?.email) return participant.user.email.split('@')[0];
    return 'Player';
  };

  const getMedalColor = (position: number) => {
    switch (position) {
      case 0:
        return '#FFD700'; // Gold
      case 1:
        return '#C0C0C0'; // Silver
      case 2:
        return '#CD7F32'; // Bronze
      default:
        return '#8B4049';
    }
  };

  const getMedalIcon = (position: number) => {
    switch (position) {
      case 0:
        return 'trophy';
      case 1:
      case 2:
        return 'medal';
      default:
        return 'musical-note';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8B4049" />
        <Text style={styles.loadingText}>Loading results...</Text>
      </View>
    );
  }

  if (!session || participants.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>No results found</Text>
      </View>
    );
  }

  const winner = participants[0];
  const isWinner = winner.userId === user?.id;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <LinearGradient
        colors={['#2D1B2E', '#8B4049', '#2D1B2E']}
        style={styles.gradient}
      />

      {/* Confetti */}
      {showConfetti && (
        <ConfettiCannon
          count={200}
          origin={{ x: -10, y: 0 }}
          autoStart={true}
          fadeOut={true}
          fallSpeed={3000}
        />
      )}

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Game Complete!</Text>
        <Text style={styles.headerSubtitle}>{session.artistname} Battle</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Winner Card */}
        <View style={styles.winnerCard}>
          <Animated.View style={[styles.trophy, { transform: [{ scale: scaleAnim }] }]}>
            <Ionicons name="trophy" size={80} color="#FFD700" />
          </Animated.View>
          
          <Text style={styles.winnerBadge}>🎉 AUX CHAMPION 🎉</Text>
          
          <View style={styles.winnerAvatar}>
            <Text style={styles.winnerAvatarText}>
              {getDisplayName(winner).charAt(0).toUpperCase()}
            </Text>
          </View>
          
          <Text style={styles.winnerName}>
            {isWinner ? 'You Won the Aux!' : `${getDisplayName(winner)} Won the Aux!`}
          </Text>
          
          <View style={styles.winnerScore}>
            <Text style={styles.winnerScoreNumber}>{winner.score}</Text>
            <Text style={styles.winnerScoreLabel}>Total Points</Text>
          </View>
        </View>

        {/* Full Leaderboard */}
        <View style={styles.leaderboardContainer}>
          <Text style={styles.leaderboardTitle}>Final Standings</Text>
          
          {participants.map((participant, index) => {
            const isCurrentUser = participant.userId === user?.id;
            const position = index + 1;
            const medalColor = getMedalColor(index);
            const medalIcon = getMedalIcon(index);
            
            return (
              <View
                key={participant.userId}
                style={[
                  styles.leaderboardItem,
                  index === 0 && styles.leaderboardItemWinner,
                  isCurrentUser && styles.leaderboardItemCurrent,
                ]}
              >
                {/* Position/Medal */}
                <View style={[styles.medalContainer, { backgroundColor: medalColor }]}>
                  {index < 3 ? (
                    <Ionicons name={medalIcon} size={24} color="#FFFBF5" />
                  ) : (
                    <Text style={styles.positionText}>{position}</Text>
                  )}
                </View>

                {/* Player Info */}
                <View style={styles.playerContainer}>
                  <View style={styles.playerAvatar}>
                    <Text style={styles.playerAvatarText}>
                      {getDisplayName(participant).charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.playerInfo}>
                    <Text style={styles.playerName}>
                      {getDisplayName(participant)}
                      {isCurrentUser && (
                        <Text style={styles.youBadgeText}> (You)</Text>
                      )}
                    </Text>
                    {participant.isHost && (
                      <View style={styles.hostBadge}>
                        <Ionicons name="star" size={12} color="#FFB800" />
                        <Text style={styles.hostBadgeText}>Host</Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Score */}
                <View style={styles.scoreContainer}>
                  <Text style={styles.scoreText}>{participant.score}</Text>
                  <Text style={styles.scoreLabel}>pts</Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <Text style={styles.statsTitle}>Match Statistics</Text>
          
          <View style={styles.statRow}>
            <View style={styles.statItem}>
              <Ionicons name="people" size={24} color="#8B4049" />
              <Text style={styles.statValue}>{participants.length}</Text>
              <Text style={styles.statLabel}>Players</Text>
            </View>
            
            <View style={styles.statItem}>
              <Ionicons name="musical-notes" size={24} color="#8B4049" />
              <Text style={styles.statValue}>{session.decksize}</Text>
              <Text style={styles.statLabel}>Rounds</Text>
            </View>
            
            <View style={styles.statItem}>
              <Ionicons name="headset" size={24} color="#8B4049" />
              <Text style={styles.statValue}>{participants.length * session.decksize}</Text>
              <Text style={styles.statLabel}>Total Tracks</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Bottom Actions */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity
          style={styles.homeButton}
          onPress={handleReturnHome}
        >
          <Ionicons name="home" size={20} color="#FFFBF5" />
          <Text style={styles.homeButtonText}>Return Home</Text>
        </TouchableOpacity>
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
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFBF5',
    marginBottom: 4,
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
  winnerCard: {
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  trophy: {
    marginBottom: 16,
  },
  winnerBadge: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 20,
    letterSpacing: 2,
  },
  winnerAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#8B4049',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 4,
    borderColor: '#FFD700',
  },
  winnerAvatarText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#FFFBF5',
  },
  winnerName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFBF5',
    textAlign: 'center',
    marginBottom: 20,
  },
  winnerScore: {
    alignItems: 'center',
  },
  winnerScoreNumber: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  winnerScoreLabel: {
    fontSize: 14,
    color: '#FFFBF5',
    opacity: 0.7,
  },
  leaderboardContainer: {
    marginBottom: 24,
  },
  leaderboardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFBF5',
    marginBottom: 16,
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 251, 245, 0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 251, 245, 0.1)',
  },
  leaderboardItemWinner: {
    borderColor: '#FFD700',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
  },
  leaderboardItemCurrent: {
    borderColor: '#8B4049',
    borderWidth: 2,
  },
  medalContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  positionText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFBF5',
  },
  playerContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  playerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(139, 64, 73, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  playerAvatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFBF5',
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFBF5',
    marginBottom: 4,
  },
  youBadgeText: {
    color: '#8B4049',
    fontWeight: 'bold',
  },
  hostBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  hostBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFB800',
  },
  scoreContainer: {
    alignItems: 'center',
    marginLeft: 12,
  },
  scoreText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFBF5',
  },
  scoreLabel: {
    fontSize: 12,
    color: '#FFFBF5',
    opacity: 0.6,
  },
  statsContainer: {
    backgroundColor: 'rgba(255, 251, 245, 0.05)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFBF5',
    marginBottom: 16,
    textAlign: 'center',
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFBF5',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#FFFBF5',
    opacity: 0.6,
    marginTop: 4,
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
  homeButton: {
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
  homeButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFBF5',
  },
});

