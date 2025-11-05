import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Rive from 'rive-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../lib/AuthContext';

export default function HomeScreen() {
  const router = useRouter();
  const { user, signOut, isSpotifyConnected, connectSpotify, disconnectSpotify } = useAuth();
  const [testing, setTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connected' | 'error'>('idle');

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!user) {
      router.replace('/auth/login');
    }
  }, [user]);

  const handleCreateSession = () => {
    if (!isSpotifyConnected) {
      Alert.alert(
        'Spotify Required',
        'You need to connect your Spotify account to create a session.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Connect', onPress: handleConnectSpotify },
        ]
      );
      return;
    }
    router.push('/session/create');
  };

  const handleJoinSession = () => {
    if (!isSpotifyConnected) {
      Alert.alert(
        'Spotify Required',
        'You need to connect your Spotify account to join a session.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Connect', onPress: handleConnectSpotify },
        ]
      );
      return;
    }
    router.push('/session/join');
  };

  const handleConnectSpotify = async () => {
    try {
      await connectSpotify();
    } catch (error) {
      Alert.alert('Error', 'Failed to connect to Spotify');
    }
  };

  const handleSignOut = async () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/auth/login');
        },
      },
    ]);
  };

  // Don't render if not authenticated
  if (!user) {
    return null;
  }

//   const testSupabaseConnection = async () => {
//     setTesting(true);
//     try {
//       // Test connection by querying the competitions table
//       const { data, error } = await supabase
//         .from('users')
//         .select('*')
//         .limit(1);
      
//       if (error) {
//         // Log detailed error information to console
//         console.log('=== SUPABASE ERROR DETAILS ===');
//         console.log('Message:', error.message);
//         console.log('Code:', error.code);
//         console.log('Details:', error.details);
//         console.log('Hint:', error.hint);
//         console.log('Full error object:', JSON.stringify(error, null, 2));
//         console.log('==============================');
//         throw error;
//       }
      
//       setConnectionStatus('connected');
//       Alert.alert(
//         '✓ Connected!',
//         `Successfully connected to Supabase!\nFound ${data ? data.length : 0} competition(s).`,
//         [{ text: 'OK', onPress: () => setConnectionStatus('idle') }]
//       );
//     } catch (err: any) {
//       setConnectionStatus('error');
      
//       // Build detailed error message
//       const errorDetails = [
//         `Message: ${err.message || 'Unknown error'}`,
//         err.code ? `Code: ${err.code}` : null,
//         err.details ? `Details: ${err.details}` : null,
//         err.hint ? `Hint: ${err.hint}` : null,
//       ].filter(Boolean).join('\n\n');
      
//       Alert.alert(
//         '✗ Connection Failed',
//         errorDetails,
//         [{ text: 'OK', onPress: () => setConnectionStatus('idle') }]
//       );
//     } finally {
//       setTesting(false);
//     }
//   };
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.beanieContainer}>
              <Rive
                resourceName="beanie_loading"
                style={styles.beanieAnimation}
                autoplay={true}
              />
            </View>
            <Text style={styles.headerTitle}>Aux Wars</Text>
          </View>
          <TouchableOpacity style={styles.profileButton} onPress={handleSignOut}>
            <View style={styles.profileIcon}>
              <Ionicons name="person" size={20} color="#FFFBF5" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Main Balance Card */}
        <View style={styles.mainCard}>
          <View style={styles.mainCardHeader}>
            <Text style={styles.balanceLabel}>Active Session</Text>
            <TouchableOpacity style={styles.detailsLink}>
              <Text style={styles.detailsLinkText}>Session History</Text>
              <Ionicons name="chevron-forward" size={16} color="#8B4049" />
            </TouchableOpacity>
          </View>
          
          <Text style={styles.balanceAmount}>No Active Session</Text>
          
          {/* Spotify Connection Status */}
          {!isSpotifyConnected ? (
            <TouchableOpacity style={styles.spotifyBanner} onPress={handleConnectSpotify}>
              <Ionicons name="musical-notes" size={20} color="#1DB954" />
              <Text style={styles.spotifyBannerText}>Connect Spotify to play</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.spotifyConnectedBanner}>
              <Ionicons name="checkmark-circle" size={20} color="#1DB954" />
              <Text style={styles.spotifyConnectedText}>Spotify Connected</Text>
              <TouchableOpacity 
                style={styles.disconnectButton}
                onPress={async () => {
                  Alert.alert(
                    'Disconnect Spotify',
                    'Are you sure you want to disconnect your Spotify account?',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Disconnect',
                        style: 'destructive',
                        onPress: async () => {
                          try {
                            await disconnectSpotify();
                            Alert.alert('Success', 'Spotify account disconnected');
                          } catch (error) {
                            Alert.alert('Error', 'Failed to disconnect Spotify');
                          }
                        },
                      },
                    ]
                  );
                }}
              >
                <Text style={styles.disconnectButtonText}>Disconnect</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.actionButton} onPress={handleCreateSession}>
              <Text style={styles.actionButtonText}>Create Session</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.actionButton, styles.actionButtonSecondary]} 
              onPress={handleJoinSession}
            >
              <Text style={styles.actionButtonText}>Join Session</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Feature Cards Grid */}
        <View style={styles.gridContainer}>
          {/* My Sessions Card */}
          <TouchableOpacity style={styles.featureCard}>
            <View style={styles.featureCardContent}>
              <Text style={styles.featureCardTitle}>My Sessions</Text>
              <Ionicons name="chevron-forward" size={20} color="#8B4049" style={styles.featureCardArrow} />
            </View>
            <View style={[styles.featureCardIcon, { backgroundColor: '#4CAF50' }]}>
              <Ionicons name="musical-notes" size={40} color="#fff" />
            </View>
            <Text style={styles.featureCardSubtitle}>Manage your music</Text>
          </TouchableOpacity>

          {/* Leaderboard Card */}
          <TouchableOpacity style={styles.featureCard}>
            <View style={styles.featureCardContent}>
              <Text style={styles.featureCardTitle}>Leaderboard</Text>
              <Ionicons name="chevron-forward" size={20} color="#8B4049" style={styles.featureCardArrow} />
            </View>
            <View style={[styles.featureCardIcon, { backgroundColor: '#FF9800' }]}>
              <Ionicons name="trophy" size={40} color="#fff" />
            </View>
            <Text style={styles.featureCardSubtitle}>Top players</Text>
          </TouchableOpacity>

          {/* Friends Card */}
          <TouchableOpacity style={styles.featureCard}>
            <View style={styles.featureCardContent}>
              <Text style={styles.featureCardTitle}>Friends</Text>
              <Ionicons name="chevron-forward" size={20} color="#8B4049" style={styles.featureCardArrow} />
            </View>
            <View style={[styles.featureCardIcon, { backgroundColor: '#2196F3' }]}>
              <Ionicons name="people" size={40} color="#fff" />
            </View>
            <Text style={styles.featureCardSubtitle}>Connect & battle</Text>
          </TouchableOpacity>

          {/* Stats Card */}
          <TouchableOpacity style={styles.featureCard}>
            <View style={styles.featureCardContent}>
              <Text style={styles.featureCardTitle}>My Stats</Text>
              <Ionicons name="chevron-forward" size={20} color="#8B4049" style={styles.featureCardArrow} />
            </View>
            <View style={[styles.featureCardIcon, { backgroundColor: '#9C27B0' }]}>
              <Ionicons name="bar-chart" size={40} color="#fff" />
            </View>
            <Text style={styles.featureCardSubtitle}>Track progress</Text>
          </TouchableOpacity>

          {/* Supabase Test Card
          <TouchableOpacity 
            style={[
              styles.featureCard,
              connectionStatus === 'connected' && styles.featureCardSuccess,
              connectionStatus === 'error' && styles.featureCardError,
            ]}
            onPress={testSupabaseConnection}
            disabled={testing}
          >
            <View style={styles.featureCardContent}>
              <Text style={styles.featureCardTitle}>Supabase</Text>
              {connectionStatus === 'connected' && (
                <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
              )}
              {connectionStatus === 'error' && (
                <Ionicons name="alert-circle" size={20} color="#F44336" />
              )}
            </View>
            <View style={[styles.featureCardIcon, { backgroundColor: '#00C853' }]}>
              {testing ? (
                <ActivityIndicator size={40} color="#fff" />
              ) : (
                <Ionicons name="cloud-done" size={40} color="#fff" />
              )}
            </View>
            <Text style={styles.featureCardSubtitle}>
              {testing ? 'Testing...' : 'Test connection'}
            </Text>
          </TouchableOpacity> */}
        </View>

        {/* Bottom spacing */}
        <View style={{ height: 40 }} />
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  beanieContainer: {
    width: 45,
    height: 45,
    justifyContent: 'center',
    alignItems: 'center',
  },
  beanieAnimation: {
    width: 80,
    height: 80,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2D1B2E',
  },
  profileButton: {
    padding: 4,
  },
  profileIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#8B4049',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainCard: {
    backgroundColor: '#FFFBF5',
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
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
  mainCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  balanceLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D1B2E',
  },
  detailsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailsLinkText: {
    fontSize: 14,
    color: '#8B4049',
  },
  balanceAmount: {
    fontSize: 38,
    fontWeight: 'bold',
    color: '#2D1B2E',
    marginBottom: 24,
  },
  spotifyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E7F5EC',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  spotifyBannerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1DB954',
  },
  spotifyConnectedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#E7F5EC',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  spotifyConnectedText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#1DB954',
    marginLeft: 8,
  },
  disconnectButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#1DB954',
  },
  disconnectButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1DB954',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#8B4049',
    paddingVertical: 16,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2D1B2E',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButtonSecondary: {
    backgroundColor: '#A5545F',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFBF5',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
  },
  featureCard: {
    width: '48%',
    backgroundColor: '#FFFBF5',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: '#E8D5C4',
    shadowColor: '#2D1B2E',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
    minHeight: 160,
  },
  featureCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  featureCardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D1B2E',
    flex: 1,
  },
  featureCardArrow: {
    marginLeft: 4,
  },
  featureCardIcon: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#2D1B2E',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  featureCardSubtitle: {
    fontSize: 13,
    color: '#999',
  },
  featureCardSuccess: {
    borderColor: '#4CAF50',
    borderWidth: 2,
  },
  featureCardError: {
    borderColor: '#F44336',
    borderWidth: 2,
  },
});

