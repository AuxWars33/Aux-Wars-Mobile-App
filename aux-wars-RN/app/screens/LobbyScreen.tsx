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
  Share,
  Platform,
  Clipboard as RNClipboard,
  StatusBar,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/AuthContext';

interface Participant {
  id: string;
  userId: string;
  isHost: boolean;
  score: number;
  joinedAt: string;
  user?: {
    id: string;
    email: string;
    username?: string;
  };
}

interface Session {
  id: string;
  name: string;
  code: string;
  hostId: string;
  maxPlayers: number;
  roundDuration: number;
  status: string;
  artistid: string;
  artistname: string;
  artistimageurl: string;
  decksize: number;
  currentround: number;
  createdAt: string;
  updatedAt: string;
}

export default function LobbyScreen() {
  const router = useRouter();
  const { sessionId } = useLocalSearchParams();
  const { user } = useAuth();

  const [session, setSession] = useState<Session | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  const isHost = session?.hostId === user?.id;

  useEffect(() => {
    if (!sessionId) {
      Alert.alert('Error', 'No session ID provided');
      router.back();
      return;
    }

    fetchSessionData();
    setupRealtimeSubscriptions();

    return () => {
      // Cleanup subscriptions
      supabase.channel('lobby').unsubscribe();
    };
  }, [sessionId]);

  const fetchSessionData = async () => {
    try {
      // Fetch session details
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (sessionError) throw sessionError;
      setSession(sessionData);

      // Fetch participants
      const { data: participantsData, error: participantsError } = await supabase
        .from('session_participants')
        .select(`
          *,
          user:users!session_participants_userId_fkey (
            id,
            email,
            username
          )
        `)
        .eq('sessionId', sessionId)
        .order('joinedAt', { ascending: true });

      if (participantsError) throw participantsError;
      setParticipants(participantsData || []);
    } catch (error) {
      console.error('Error fetching session data:', error);
      Alert.alert('Error', 'Failed to load session. Please try again.');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscriptions = () => {
    // Subscribe to session updates
    const sessionChannel = supabase
      .channel('lobby')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sessions',
          filter: `id=eq.${sessionId}`,
        },
        (payload) => {
          console.log('Session updated:', payload);
          if (payload.eventType === 'UPDATE') {
            setSession(payload.new as Session);
            
            // If session started, navigate to game screen
            if (payload.new.status === 'active') {
              Alert.alert('Game Starting!', 'Get ready to battle!', [
                {
                  text: 'OK',
                  onPress: () => {
                    // TODO: Navigate to game screen
                    console.log('Navigate to game screen');
                  },
                },
              ]);
            }
          } else if (payload.eventType === 'DELETE') {
            Alert.alert('Session Ended', 'The host has cancelled the session.', [
              { text: 'OK', onPress: () => router.push('/(tabs)') },
            ]);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'session_participants',
          filter: `sessionId=eq.${sessionId}`,
        },
        (payload) => {
          console.log('Participants updated:', payload);
          // Refresh participants list
          fetchSessionData();
        }
      )
      .subscribe();
  };

  const handleCopyCode = async () => {
    if (!session) return;
    
    try {
      RNClipboard.setString(session.code);
      Alert.alert('Copied!', 'Session code copied to clipboard');
    } catch (error) {
      console.error('Copy error:', error);
    }
  };

  const handleShareCode = async () => {
    if (!session) return;

    try {
      const message = `Join my Aux Wars session!\n\nSession: ${session.name}\nArtist: ${session.artistname}\nCode: ${session.code}\n\nEnter this code in the app to join!`;
      
      await Share.share({
        message,
        title: 'Join my Aux Wars session!',
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const handleStartSession = async () => {
    if (!isHost || !session) return;

    Alert.alert(
      'Start Session?',
      `Start the game with ${participants.length} player${participants.length > 1 ? 's' : ''}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start',
          onPress: async () => {
            setStarting(true);
            try {
              // Update session status to active
              const { error } = await supabase
                .from('sessions')
                .update({ 
                  status: 'active',
                  updatedAt: new Date().toISOString(),
                })
                .eq('id', sessionId);

              if (error) throw error;

              // The realtime subscription will handle navigation
            } catch (error) {
              console.error('Error starting session:', error);
              Alert.alert('Error', 'Failed to start session. Please try again.');
              setStarting(false);
            }
          },
        },
      ]
    );
  };

  const handleLeaveSession = async () => {
    if (!session) return;

    Alert.alert(
      isHost ? 'Cancel Session?' : 'Leave Session?',
      isHost
        ? 'This will end the session for all players.'
        : 'Are you sure you want to leave?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          style: 'destructive',
          onPress: async () => {
            try {
              if (isHost) {
                // Delete the session (cascade will remove participants)
                const { error } = await supabase
                  .from('sessions')
                  .delete()
                  .eq('id', sessionId);

                if (error) throw error;
              } else {
                // Remove participant
                const { error } = await supabase
                  .from('session_participants')
                  .delete()
                  .eq('sessionId', sessionId)
                  .eq('userId', user?.id);

                if (error) throw error;
              }

              router.push('/(tabs)');
            } catch (error) {
              console.error('Error leaving session:', error);
              Alert.alert('Error', 'Failed to leave session. Please try again.');
            }
          },
        },
      ]
    );
  };

  const getDisplayName = (participant: Participant) => {
    if (participant.user?.username) {
      return participant.user.username;
    }
    if (participant.user?.email) {
      return participant.user.email.split('@')[0];
    }
    return 'Player';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8B4049" />
        <Text style={styles.loadingText}>Loading lobby...</Text>
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
        <TouchableOpacity style={styles.backButton} onPress={handleLeaveSession}>
          <Ionicons name="close" size={28} color="#2D1B2E" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Lobby</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Session Code Card */}
        <View style={styles.codeCard}>
          <Text style={styles.codeLabel}>Session Code</Text>
          <View style={styles.codeContainer}>
            <Text style={styles.codeText}>{session.code}</Text>
          </View>
          <View style={styles.codeActions}>
            <TouchableOpacity style={styles.codeButton} onPress={handleCopyCode}>
              <Ionicons name="copy-outline" size={20} color="#8B4049" />
              <Text style={styles.codeButtonText}>Copy</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.codeButton} onPress={handleShareCode}>
              <Ionicons name="share-outline" size={20} color="#8B4049" />
              <Text style={styles.codeButtonText}>Share</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Session Info */}
        <View style={styles.infoCard}>
          <View style={styles.sessionHeader}>
            <View style={styles.sessionHeaderLeft}>
              <Text style={styles.sessionName}>{session.name}</Text>
              <Text style={styles.sessionDetail}>
                {participants.length}/{session.maxPlayers} Players
              </Text>
            </View>
          </View>

          {/* Artist Info */}
          <View style={styles.artistSection}>
            <Text style={styles.artistLabel}>Battling with</Text>
            <View style={styles.artistContainer}>
              {session.artistimageurl && (
                <Image
                  source={{ uri: session.artistimageurl }}
                  style={styles.artistImage}
                />
              )}
              <View style={styles.artistInfo}>
                <Text style={styles.artistName}>{session.artistname}</Text>
                <Text style={styles.artistDetail}>
                  {session.decksize} songs per player
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Participants List */}
        <View style={styles.participantsCard}>
          <View style={styles.participantsHeader}>
            <Text style={styles.participantsTitle}>Players</Text>
            <View style={styles.participantsBadge}>
              <Text style={styles.participantsBadgeText}>{participants.length}</Text>
            </View>
          </View>

          {participants.map((participant, index) => (
            <View key={participant.id} style={styles.participantItem}>
              <View style={styles.participantLeft}>
                <View
                  style={[
                    styles.participantAvatar,
                    participant.isHost && styles.participantAvatarHost,
                  ]}
                >
                  <Text style={styles.participantAvatarText}>
                    {getDisplayName(participant).charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.participantInfo}>
                  <Text style={styles.participantName}>
                    {getDisplayName(participant)}
                  </Text>
                  {participant.isHost && (
                    <View style={styles.hostBadge}>
                      <Ionicons name="star" size={12} color="#FFB800" />
                      <Text style={styles.hostBadgeText}>Host</Text>
                    </View>
                  )}
                </View>
              </View>
              {participant.userId === user?.id && (
                <View style={styles.youBadge}>
                  <Text style={styles.youBadgeText}>You</Text>
                </View>
              )}
            </View>
          ))}

          {/* Empty Slots */}
          {Array.from({ length: session.maxPlayers - participants.length }).map(
            (_, index) => (
              <View key={`empty-${index}`} style={styles.emptySlot}>
                <View style={styles.emptySlotIcon}>
                  <Ionicons name="person-add-outline" size={20} color="#CCC" />
                </View>
                <Text style={styles.emptySlotText}>Waiting for player...</Text>
              </View>
            )
          )}
        </View>

        {/* Waiting Message for Non-Host */}
        {!isHost && (
          <View style={styles.waitingCard}>
            <Ionicons name="time-outline" size={24} color="#8B4049" />
            <Text style={styles.waitingText}>
              Waiting for host to start the game...
            </Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Start Button (Host Only) */}
      {isHost && (
        <View style={styles.bottomContainer}>
          <TouchableOpacity
            style={[
              styles.startButton,
              starting && styles.startButtonDisabled,
            ]}
            onPress={handleStartSession}
            disabled={starting}
          >
            {starting ? (
              <ActivityIndicator color="#FFFBF5" />
            ) : (
              <>
                <Text style={styles.startButtonText}>Start Game</Text>
                <Ionicons name="play" size={20} color="#FFFBF5" />
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
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
    paddingBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2D1B2E',
  },
  placeholder: {
    width: 44,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 24,
  },
  codeCard: {
    backgroundColor: '#FFFBF5',
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#E8D5C4',
    alignItems: 'center',
  },
  codeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
  },
  codeContainer: {
    backgroundColor: '#2D1B2E',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    marginBottom: 16,
  },
  codeText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFBF5',
    letterSpacing: 8,
  },
  codeActions: {
    flexDirection: 'row',
    gap: 12,
  },
  codeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF9F0',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#8B4049',
  },
  codeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B4049',
  },
  infoCard: {
    backgroundColor: '#FFFBF5',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#E8D5C4',
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E8D5C4',
  },
  sessionHeaderLeft: {
    flex: 1,
  },
  sessionName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D1B2E',
    marginBottom: 4,
  },
  sessionDetail: {
    fontSize: 14,
    color: '#666',
  },
  artistSection: {
    marginTop: 8,
  },
  artistLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  artistContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E7F5EC',
    borderRadius: 12,
    padding: 12,
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
  artistDetail: {
    fontSize: 14,
    color: '#666',
  },
  participantsCard: {
    backgroundColor: '#FFFBF5',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#E8D5C4',
  },
  participantsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  participantsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D1B2E',
    marginRight: 8,
  },
  participantsBadge: {
    backgroundColor: '#8B4049',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  participantsBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFBF5',
  },
  participantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#FFF9F0',
    borderRadius: 12,
    marginBottom: 8,
  },
  participantLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  participantAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E8D5C4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  participantAvatarHost: {
    backgroundColor: '#FFE5A0',
    borderWidth: 2,
    borderColor: '#FFB800',
  },
  participantAvatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D1B2E',
  },
  participantInfo: {
    flex: 1,
  },
  participantName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D1B2E',
    marginBottom: 2,
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
  youBadge: {
    backgroundColor: '#8B4049',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  youBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFBF5',
  },
  emptySlot: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
  },
  emptySlotIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  emptySlotText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  waitingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  waitingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B4049',
  },
  bottomContainer: {
    padding: 24,
    paddingBottom: 40,
    backgroundColor: '#FFF9F0',
    borderTopWidth: 1,
    borderTopColor: '#E8D5C4',
  },
  startButton: {
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
  startButtonDisabled: {
    opacity: 0.5,
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFBF5',
  },
  startHint: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
});

