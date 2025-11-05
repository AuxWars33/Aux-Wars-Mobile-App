import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/AuthContext';

interface Session {
  id: string;
  name: string;
  code: string;
  hostId: string;
  status: string;
  artistname: string;
  artistimageurl: string;
  decksize: number;
  maxPlayers: number;
  createdAt: string;
  participantCount?: number;
}

export default function LobbyTabScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeSessions, setActiveSessions] = useState<Session[]>([]);

  useFocusEffect(
    React.useCallback(() => {
      fetchActiveSessions();
    }, [user])
  );

  const fetchActiveSessions = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Get all sessions where user is a participant and status is waiting or active
      const { data: participants, error: participantsError } = await supabase
        .from('session_participants')
        .select('sessionId')
        .eq('userId', user.id);

      if (participantsError) throw participantsError;

      if (!participants || participants.length === 0) {
        setActiveSessions([]);
        setLoading(false);
        return;
      }

      const sessionIds = participants.map((p) => p.sessionId);

      // Get session details for active sessions
      const { data: sessions, error: sessionsError } = await supabase
        .from('sessions')
        .select('*')
        .in('id', sessionIds)
        .in('status', ['waiting', 'active'])
        .order('createdAt', { ascending: false });

      if (sessionsError) throw sessionsError;

      // Get participant counts for each session
      if (sessions && sessions.length > 0) {
        const sessionsWithCounts = await Promise.all(
          sessions.map(async (session) => {
            const { count } = await supabase
              .from('session_participants')
              .select('*', { count: 'exact', head: true })
              .eq('sessionId', session.id);

            return {
              ...session,
              participantCount: count || 0,
            };
          })
        );

        setActiveSessions(sessionsWithCounts);
      } else {
        setActiveSessions([]);
      }
    } catch (error) {
      console.error('Error fetching active sessions:', error);
      setActiveSessions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinLobby = (sessionId: string) => {
    router.push(`/session/lobby?sessionId=${sessionId}` as any);
  };

  const handleCreateSession = () => {
    router.push('/session/create');
  };

  const handleJoinSession = () => {
    router.push('/session/join');
  };

  const handleDeleteSession = async (session: Session) => {
    Alert.alert(
      'Delete Session?',
      `Are you sure you want to delete "${session.name}"? This will end the session for all players.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('sessions')
                .delete()
                .eq('id', session.id)
                .eq('hostId', user?.id); // Extra safety check

              if (error) throw error;

              // Refresh the list
              await fetchActiveSessions();
              
              Alert.alert('Success', 'Session deleted successfully');
            } catch (error) {
              console.error('Error deleting session:', error);
              Alert.alert('Error', 'Failed to delete session. Please try again.');
            }
          },
        },
      ]
    );
  };

  const renderSessionCard = (session: Session) => {
    const isHost = session.hostId === user?.id;

    return (
      <View key={session.id} style={styles.sessionCard}>
        <TouchableOpacity
          style={styles.sessionCardTouchable}
          onPress={() => handleJoinLobby(session.id)}
          activeOpacity={0.7}
        >
          <View style={styles.sessionCardHeader}>
            <View style={styles.sessionCardLeft}>
              {session.artistimageurl ? (
                <Image
                  source={{ uri: session.artistimageurl }}
                  style={styles.artistThumbnail}
                />
              ) : (
                <View style={[styles.artistThumbnail, styles.artistThumbnailPlaceholder]}>
                  <Ionicons name="musical-notes" size={24} color="#8B4049" />
                </View>
              )}
              <View style={styles.sessionCardInfo}>
                <Text style={styles.sessionCardName} numberOfLines={1}>
                  {session.name}
                </Text>
                <Text style={styles.sessionCardArtist} numberOfLines={1}>
                  {session.artistname}
                </Text>
              </View>
            </View>
            <View style={styles.sessionCardRight}>
              {isHost && (
                <View style={styles.hostBadge}>
                  <Ionicons name="star" size={14} color="#FFB800" />
                  <Text style={styles.hostBadgeText}>Host</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.sessionCardFooter}>
            <View style={styles.sessionCardDetail}>
              <Ionicons name="people" size={16} color="#666" />
              <Text style={styles.sessionCardDetailText}>
                {session.participantCount}/{session.maxPlayers} Players
              </Text>
            </View>
            <View style={styles.sessionCardDetail}>
              <Ionicons name="code-outline" size={16} color="#666" />
              <Text style={styles.sessionCardDetailText}>{session.code}</Text>
            </View>
          </View>

          <View style={styles.sessionCardStatus}>
            <View style={[styles.statusDot, session.status === 'active' && styles.statusDotActive]} />
            <Text style={styles.statusText}>
              {session.status === 'waiting' ? 'Waiting' : 'In Progress'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Delete Button - Only visible for host */}
        {isHost && (
          <View style={styles.deleteButtonContainer}>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDeleteSession(session)}
            >
              <Ionicons name="trash-outline" size={18} color="#FF3B30" />
              <Text style={styles.deleteButtonText}>Delete Session</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Lobbies</Text>
          <TouchableOpacity onPress={fetchActiveSessions}>
            <Ionicons name="refresh" size={24} color="#8B4049" />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#8B4049" />
              <Text style={styles.loadingText}>Loading your lobbies...</Text>
            </View>
          ) : activeSessions.length > 0 ? (
            <>
              <Text style={styles.sectionTitle}>Active Sessions</Text>
              {activeSessions.map(renderSessionCard)}
              
              <View style={styles.divider} />
              
              <Text style={styles.sectionSubtitle}>Or start something new</Text>
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={handleCreateSession}
                >
                  <Ionicons name="add-circle" size={24} color="#8B4049" />
                  <Text style={styles.actionButtonText}>Create Session</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={handleJoinSession}
                >
                  <Ionicons name="enter" size={24} color="#8B4049" />
                  <Text style={styles.actionButtonText}>Join Session</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.iconContainer}>
                <Ionicons name="headset" size={80} color="#8B4049" />
              </View>
              <Text style={styles.emptyTitle}>No Active Lobbies</Text>
              <Text style={styles.emptySubtitle}>
                Create or join a session to start battling with music
              </Text>

              <TouchableOpacity style={styles.primaryButton} onPress={handleCreateSession}>
                <Text style={styles.primaryButtonText}>Create Session</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.secondaryButton} onPress={handleJoinSession}>
                <Text style={styles.secondaryButtonText}>Join Session</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF9F0',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#FFF9F0',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2D1B2E',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D1B2E',
    marginBottom: 16,
  },
  sectionSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
  },
  sessionCard: {
    backgroundColor: '#FFFBF5',
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#E8D5C4',
    shadowColor: '#2D1B2E',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
  },
  sessionCardTouchable: {
    padding: 16,
  },
  sessionCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sessionCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sessionCardRight: {
    marginLeft: 8,
  },
  artistThumbnail: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  artistThumbnailPlaceholder: {
    backgroundColor: '#E8D5C4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sessionCardInfo: {
    flex: 1,
  },
  sessionCardName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D1B2E',
    marginBottom: 4,
  },
  sessionCardArtist: {
    fontSize: 14,
    color: '#666',
  },
  hostBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  hostBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFB800',
  },
  sessionCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sessionCardDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sessionCardDetailText: {
    fontSize: 14,
    color: '#666',
  },
  sessionCardStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFB800',
  },
  statusDotActive: {
    backgroundColor: '#4CAF50',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  divider: {
    height: 1,
    backgroundColor: '#E8D5C4',
    marginVertical: 24,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFFBF5',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#8B4049',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B4049',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    paddingBottom: 40,
  },
  iconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#FFFBF5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 3,
    borderColor: '#8B4049',
    shadowColor: '#2D1B2E',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  emptyTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2D1B2E',
    marginBottom: 12,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginBottom: 40,
    paddingHorizontal: 20,
    lineHeight: 24,
  },
  primaryButton: {
    backgroundColor: '#8B4049',
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 24,
    marginBottom: 16,
    width: '80%',
    alignItems: 'center',
    shadowColor: '#2D1B2E',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFBF5',
  },
  secondaryButton: {
    backgroundColor: '#FFFBF5',
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#8B4049',
    width: '80%',
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#8B4049',
  },
  deleteButtonContainer: {
    borderTopWidth: 1,
    borderTopColor: '#E8D5C4',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF9F0',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#FFFBF5',
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF3B30',
  },
});

