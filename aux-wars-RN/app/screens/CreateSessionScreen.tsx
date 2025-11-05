import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import SpotifyService, { SpotifyArtist } from '../../lib/spotifyService';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/AuthContext';

export default function CreateSessionScreen() {
  const router = useRouter();
  const { user, isSpotifyConnected, connectSpotify } = useAuth();
  
  const [sessionName, setSessionName] = useState('');
  const [artistSearch, setArtistSearch] = useState('');
  const [searchResults, setSearchResults] = useState<SpotifyArtist[]>([]);
  const [selectedArtist, setSelectedArtist] = useState<SpotifyArtist | null>(null);
  const [deckSize, setDeckSize] = useState(5);
  const [searching, setSearching] = useState(false);
  const [creating, setCreating] = useState(false);

  // Check Spotify connection on mount
  useEffect(() => {
    if (!isSpotifyConnected) {
      Alert.alert(
        'Spotify Required',
        'You need to connect your Spotify account to search for artists.',
        [
          { text: 'Cancel', style: 'cancel', onPress: () => router.back() },
          { text: 'Connect Spotify', onPress: handleConnectSpotify },
        ]
      );
    }
  }, []);

  const handleConnectSpotify = async () => {
    try {
      await connectSpotify();
    } catch (error) {
      Alert.alert('Error', 'Failed to connect to Spotify. Please try again.');
      router.back();
    }
  };

  const handleSearchArtist = async () => {
    if (!artistSearch.trim()) return;

    // Check if Spotify is connected before searching
    if (!isSpotifyConnected) {
      Alert.alert(
        'Spotify Required',
        'Please connect your Spotify account first.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Connect Now', onPress: handleConnectSpotify },
        ]
      );
      return;
    }

    setSearching(true);
    try {
      const results = await SpotifyService.searchArtists(artistSearch);
      setSearchResults(results);
    } catch (error: any) {
      console.error('Artist search error:', error);
      
      // Check if it's an authentication error
      if (error.response?.status === 401 || error.response?.status === 403) {
        Alert.alert(
          'Spotify Authentication Failed',
          'Your Spotify session has expired. Please reconnect.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Reconnect', onPress: handleConnectSpotify },
          ]
        );
      } else {
        Alert.alert('Error', 'Failed to search artists. Please try again.');
      }
    } finally {
      setSearching(false);
    }
  };

  const handleSelectArtist = (artist: SpotifyArtist) => {
    setSelectedArtist(artist);
    setSearchResults([]);
    setArtistSearch(artist.name);
  };

  const generateSessionCode = () => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return code;
  };

  const handleCreateSession = async () => {
    if (!sessionName.trim()) {
      Alert.alert('Error', 'Please enter a session name');
      return;
    }

    if (!selectedArtist) {
      Alert.alert('Error', 'Please select an artist');
      return;
    }

    if (deckSize < 3 || deckSize > 10) {
      Alert.alert('Error', 'Deck size must be between 3 and 10');
      return;
    }

    setCreating(true);
    try {
      const sessionCode = generateSessionCode();

      // Create session in Supabase
      const { data: session, error } = await supabase
        .from('sessions')
        .insert({
          name: sessionName,
          code: sessionCode,
          hostId: user?.id,
          maxPlayers: 8,
          roundDuration: 30,
          status: 'waiting',
          artistid: selectedArtist.id,
          artistname: selectedArtist.name,
          artistimageurl: selectedArtist.images[0]?.url || '',
          decksize: deckSize,
          currentround: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      // Add host as first participant
      const { error: participantError } = await supabase
        .from('session_participants')
        .insert({
          sessionId: session.id,
          userId: user?.id,
          isHost: true,
          score: 0,
          joinedAt: new Date().toISOString(),
        });

      if (participantError) throw participantError;

      Alert.alert(
        'Session Created!',
        `Your session code is: ${sessionCode}\nShare this code with your friends!`,
        [
          {
            text: 'OK',
            onPress: () => {
              router.push(`/session/lobby?sessionId=${session.id}` as any);
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('Create session error:', error);
      Alert.alert('Error', 'Failed to create session. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const renderArtistResult = ({ item }: { item: SpotifyArtist }) => (
    <TouchableOpacity
      style={styles.artistResult}
      onPress={() => handleSelectArtist(item)}
    >
      {item.images[0] && (
        <Image source={{ uri: item.images[0].url }} style={styles.artistImage} />
      )}
      <View style={styles.artistInfo}>
        <Text style={styles.artistName}>{item.name}</Text>
        <Text style={styles.artistGenres}>
          {item.genres.slice(0, 2).join(', ') || 'No genres'}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#8B4049" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#2D1B2E" />
          </TouchableOpacity>
          <Text style={styles.title}>Create Session</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Spotify Connection Banner */}
        {!isSpotifyConnected && (
          <View style={styles.spotifyBanner}>
            <Ionicons name="alert-circle" size={20} color="#FF9800" />
            <Text style={styles.spotifyBannerText}>
              Spotify not connected. Artist search will not work.
            </Text>
            <TouchableOpacity onPress={handleConnectSpotify}>
              <Text style={styles.spotifyBannerLink}>Connect</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Session Name */}
        <View style={styles.section}>
          <Text style={styles.label}>Session Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter session name..."
            placeholderTextColor="#999"
            value={sessionName}
            onChangeText={setSessionName}
            editable={!creating}
          />
        </View>

        {/* Artist Search */}
        <View style={styles.section}>
          <Text style={styles.label}>Select Artist</Text>
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search for an artist..."
              placeholderTextColor="#999"
              value={artistSearch}
              onChangeText={setArtistSearch}
              onSubmitEditing={handleSearchArtist}
              editable={!creating}
            />
            <TouchableOpacity
              style={styles.searchButton}
              onPress={handleSearchArtist}
              disabled={searching || creating}
            >
              {searching ? (
                <ActivityIndicator color="#FFFBF5" size="small" />
              ) : (
                <Ionicons name="search" size={20} color="#FFFBF5" />
              )}
            </TouchableOpacity>
          </View>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <View style={styles.resultsContainer}>
              <FlatList
                data={searchResults}
                renderItem={renderArtistResult}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
              />
            </View>
          )}

          {/* Selected Artist */}
          {selectedArtist && (
            <View style={styles.selectedArtist}>
              {selectedArtist.images[0] && (
                <Image
                  source={{ uri: selectedArtist.images[0].url }}
                  style={styles.selectedArtistImage}
                />
              )}
              <View style={styles.selectedArtistInfo}>
                <Text style={styles.selectedArtistName}>{selectedArtist.name}</Text>
                <Text style={styles.selectedArtistGenres}>
                  {selectedArtist.genres.slice(0, 2).join(', ') || 'No genres'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedArtist(null)}>
                <Ionicons name="close-circle" size={24} color="#8B4049" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Deck Size */}
        <View style={styles.section}>
          <Text style={styles.label}>Songs Per Player (Deck Size)</Text>
          <View style={styles.deckSizeContainer}>
            <TouchableOpacity
              style={styles.deckButton}
              onPress={() => setDeckSize(Math.max(3, deckSize - 1))}
              disabled={creating}
            >
              <Ionicons name="remove" size={24} color="#8B4049" />
            </TouchableOpacity>
            <Text style={styles.deckSize}>{deckSize}</Text>
            <TouchableOpacity
              style={styles.deckButton}
              onPress={() => setDeckSize(Math.min(10, deckSize + 1))}
              disabled={creating}
            >
              <Ionicons name="add" size={24} color="#8B4049" />
            </TouchableOpacity>
          </View>
          <Text style={styles.helperText}>
            Each player will choose {deckSize} songs. The match will have {deckSize} rounds.
          </Text>
        </View>

        {/* Create Button */}
        <TouchableOpacity
          style={[styles.createButton, creating && styles.createButtonDisabled]}
          onPress={handleCreateSession}
          disabled={creating}
        >
          {creating ? (
            <ActivityIndicator color="#FFFBF5" />
          ) : (
            <Text style={styles.createButtonText}>Create Session</Text>
          )}
        </TouchableOpacity>

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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2D1B2E',
  },
  placeholder: {
    width: 40,
  },
  spotifyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 24,
    marginBottom: 20,
    borderRadius: 8,
    gap: 8,
  },
  spotifyBannerText: {
    flex: 1,
    fontSize: 13,
    color: '#E65100',
    fontWeight: '500',
  },
  spotifyBannerLink: {
    fontSize: 13,
    color: '#FF9800',
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
  section: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D1B2E',
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#FFFBF5',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E8D5C4',
    paddingHorizontal: 16,
    height: 56,
    fontSize: 16,
    color: '#2D1B2E',
  },
  searchContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#FFFBF5',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E8D5C4',
    paddingHorizontal: 16,
    height: 56,
    fontSize: 16,
    color: '#2D1B2E',
  },
  searchButton: {
    backgroundColor: '#8B4049',
    borderRadius: 12,
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultsContainer: {
    marginTop: 12,
    backgroundColor: '#FFFBF5',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E8D5C4',
    overflow: 'hidden',
  },
  artistResult: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E8D5C4',
  },
  artistImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  artistInfo: {
    flex: 1,
  },
  artistName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D1B2E',
    marginBottom: 4,
  },
  artistGenres: {
    fontSize: 12,
    color: '#999',
  },
  selectedArtist: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E7F5EC',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
  },
  selectedArtistImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 12,
  },
  selectedArtistInfo: {
    flex: 1,
  },
  selectedArtistName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D1B2E',
    marginBottom: 4,
  },
  selectedArtistGenres: {
    fontSize: 14,
    color: '#666',
  },
  deckSizeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  deckButton: {
    backgroundColor: '#FFFBF5',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E8D5C4',
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deckSize: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2D1B2E',
    minWidth: 60,
    textAlign: 'center',
  },
  helperText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 12,
  },
  createButton: {
    backgroundColor: '#8B4049',
    borderRadius: 12,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 24,
    shadowColor: '#2D1B2E',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFBF5',
  },
});

