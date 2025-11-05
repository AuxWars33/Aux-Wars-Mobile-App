import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/AuthContext';

export default function JoinSessionScreen() {
  const router = useRouter();
  const { user } = useAuth();
  
  const [sessionCode, setSessionCode] = useState('');
  const [joining, setJoining] = useState(false);

  const handleJoinSession = async () => {
    if (!sessionCode.trim() || sessionCode.length !== 6) {
      Alert.alert('Error', 'Please enter a valid 6-character session code');
      return;
    }

    setJoining(true);
    try {
      // Find session by code
      const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .select('*')
        .eq('code', sessionCode.toUpperCase())
        .single();

      if (sessionError || !session) {
        Alert.alert('Error', 'Session not found. Please check the code and try again.');
        setJoining(false);
        return;
      }

      // Check if session is full
      const { data: participants, error: participantsError } = await supabase
        .from('session_participants')
        .select('*')
        .eq('sessionId', session.id);

      if (participantsError) throw participantsError;

      if (participants && participants.length >= session.maxPlayers) {
        Alert.alert('Error', 'This session is full.');
        setJoining(false);
        return;
      }

      // Check if user is already in the session
      const isAlreadyJoined = participants?.some(
        (p: any) => p.userId === user?.id
      );

      if (isAlreadyJoined) {
        Alert.alert('Already Joined', 'You are already in this session!', [
          {
            text: 'OK',
            onPress: () => {
              router.push(`/session/lobby?sessionId=${session.id}` as any);
            },
          },
        ]);
        setJoining(false);
        return;
      }

      // Check if session is still in waiting status
      if (session.status !== 'waiting') {
        Alert.alert('Error', 'This session has already started or ended.');
        setJoining(false);
        return;
      }

      // Join the session
      const { error: joinError } = await supabase
        .from('session_participants')
        .insert({
          sessionId: session.id,
          userId: user?.id,
          isHost: false,
          score: 0,
          joinedAt: new Date().toISOString(),
        });

      if (joinError) throw joinError;

      Alert.alert(
        'Success!',
        `Joined "${session.name}"!\nPrepare to battle with ${session.artistname} songs!`,
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
      console.error('Join session error:', error);
      Alert.alert('Error', 'Failed to join session. Please try again.');
    } finally {
      setJoining(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#2D1B2E" />
          </TouchableOpacity>
          <Text style={styles.title}>Join Session</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Main Content */}
        <View style={styles.main}>
          <View style={styles.iconContainer}>
            <Ionicons name="enter" size={80} color="#8B4049" />
          </View>

          <Text style={styles.instruction}>
            Enter the 6-character session code shared by the host
          </Text>

          {/* Session Code Input */}
          <TextInput
            style={styles.codeInput}
            placeholder="ABC123"
            placeholderTextColor="#999"
            value={sessionCode}
            onChangeText={(text) => setSessionCode(text.toUpperCase())}
            maxLength={6}
            autoCapitalize="characters"
            autoCorrect={false}
            editable={!joining}
          />

          {/* Join Button */}
          <TouchableOpacity
            style={[styles.joinButton, joining && styles.joinButtonDisabled]}
            onPress={handleJoinSession}
            disabled={joining}
          >
            {joining ? (
              <ActivityIndicator color="#FFFBF5" />
            ) : (
              <>
                <Text style={styles.joinButtonText}>Join Session</Text>
                <Ionicons name="arrow-forward" size={20} color="#FFFBF5" />
              </>
            )}
          </TouchableOpacity>

          {/* Helper Text */}
          <View style={styles.helperContainer}>
            <Ionicons name="information-circle-outline" size={20} color="#666" />
            <Text style={styles.helperText}>
              Ask the host to share their session code with you
            </Text>
          </View>
        </View>

        {/* Bottom Link */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Want to create your own? </Text>
          <TouchableOpacity onPress={() => router.push('/session/create')}>
            <Text style={styles.footerLink}>Create Session</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF9F0',
  },
  content: {
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
  main: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    alignItems: 'center',
  },
  iconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#FFFBF5',
    borderWidth: 3,
    borderColor: '#8B4049',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  instruction: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 20,
    lineHeight: 24,
  },
  codeInput: {
    backgroundColor: '#FFFBF5',
    borderRadius: 12,
    borderWidth: 3,
    borderColor: '#8B4049',
    paddingHorizontal: 24,
    height: 72,
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2D1B2E',
    textAlign: 'center',
    letterSpacing: 4,
    width: '100%',
    marginBottom: 24,
  },
  joinButton: {
    backgroundColor: '#8B4049',
    borderRadius: 12,
    height: 56,
    width: '100%',
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
    marginBottom: 24,
  },
  joinButtonDisabled: {
    opacity: 0.6,
  },
  joinButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFBF5',
  },
  helperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
  },
  helperText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 40,
  },
  footerText: {
    fontSize: 14,
    color: '#666',
  },
  footerLink: {
    fontSize: 14,
    color: '#8B4049',
    fontWeight: 'bold',
  },
});

