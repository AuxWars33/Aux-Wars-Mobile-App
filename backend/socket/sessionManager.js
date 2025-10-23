class SessionManager {
  constructor(io, prisma) {
    this.io = io;
    this.prisma = prisma;
    this.activeSessions = new Map();
  }

  async joinSession(socket, data) {
    const { sessionCode, userId } = data;

    if (!sessionCode || !userId) {
      socket.emit('error', { message: 'Session code and User ID are required' });
      return;
    }

    try {
      const session = await this.prisma.session.findUnique({
        where: { code: sessionCode },
        include: { 
          participants: { 
            include: { user: true } 
          },
          host: true
        }
      });

      if (!session) {
        socket.emit('error', { message: 'Session not found' });
        return;
      }

      if (session.status !== 'waiting') {
        socket.emit('error', { message: 'Session already started' });
        return;
      }

      // Check if session is full
      if (session.participants.length >= session.maxPlayers) {
        socket.emit('error', { message: 'Session is full' });
        return;
      }

      // Add player to session
      let participant = await this.prisma.sessionParticipant.findUnique({
        where: {
          sessionId_userId: {
            sessionId: session.id,
            userId: userId
          }
        }
      });

      if (!participant) {
        participant = await this.prisma.sessionParticipant.create({
          data: {
            sessionId: session.id,
            userId: userId
          },
          include: { user: true }
        });
      }

      socket.join(sessionCode);
      socket.sessionCode = sessionCode;
      socket.sessionId = session.id;
      socket.userId = userId;

      // Broadcast updated player list
      const updatedSession = await this.getSessionWithPlayers(session.id);
      this.io.to(sessionCode).emit('session_updated', updatedSession);

      console.log(`User ${userId} joined session ${sessionCode}`);
    } catch (error) {
      console.error('Join session error:', error);
      socket.emit('error', { message: 'Failed to join session' });
    }
  }

  async leaveSession(socket, data) {
    const { sessionId, userId } = data;

    if (!sessionId || !userId) {
      return;
    }

    try {
      // Remove participant
      await this.prisma.sessionParticipant.deleteMany({
        where: {
          sessionId,
          userId
        }
      });

      const session = await this.prisma.session.findUnique({
        where: { id: sessionId }
      });

      if (session) {
        // Notify other users
        const updatedSession = await this.getSessionWithPlayers(sessionId);
        this.io.to(session.code).emit('session_updated', updatedSession);
      }

      socket.leave(session?.code);
      console.log(`User ${userId} left session ${sessionId}`);
    } catch (error) {
      console.error('Leave session error:', error);
    }
  }

  async startMatch(socket, data) {
    const { sessionId } = data;

    if (!sessionId) {
      socket.emit('error', { message: 'Session ID is required' });
      return;
    }

    try {
      const session = await this.prisma.session.findUnique({
        where: { id: sessionId },
        include: { participants: true }
      });

      if (!session) {
        socket.emit('error', { message: 'Session not found' });
        return;
      }

      if (session.hostId !== socket.userId) {
        socket.emit('error', { message: 'Only host can start match' });
        return;
      }

      if (session.participants.length < 2) {
        socket.emit('error', { message: 'Minimum 2 players required' });
        return;
      }

      // Update session status
      await this.prisma.session.update({
        where: { id: sessionId },
        data: { status: 'active' }
      });

      // Create first round
      await this.createRound(sessionId, 1);

      this.io.to(socket.sessionCode).emit('match_started', { sessionId });
      
      // Start first round after delay
      setTimeout(() => {
        this.startRound(sessionId, 1);
      }, 3000);

      console.log(`Match started in session ${sessionId}`);
    } catch (error) {
      console.error('Start match error:', error);
      socket.emit('error', { message: 'Failed to start match' });
    }
  }

  async createRound(sessionId, roundNumber) {
    try {
      const round = await this.prisma.round.create({
        data: {
          sessionId,
          roundNumber,
          status: 'waiting'
        }
      });

      console.log(`Round ${roundNumber} created for session ${sessionId}`);
      return round;
    } catch (error) {
      console.error('Create round error:', error);
      throw error;
    }
  }

  async startRound(sessionId, roundNumber) {
    try {
      const session = await this.prisma.session.findUnique({
        where: { id: sessionId }
      });

      const round = await this.prisma.round.findFirst({
        where: {
          sessionId,
          roundNumber
        }
      });

      if (!round) {
        console.error(`Round ${roundNumber} not found for session ${sessionId}`);
        return;
      }

      await this.prisma.round.update({
        where: { id: round.id },
        data: { status: 'active', startedAt: new Date() }
      });

      // Emit round start
      this.io.to(session.code).emit('round_started', {
        roundNumber,
        roundDuration: session.roundDuration
      });

      console.log(`Round ${roundNumber} started in session ${sessionId}`);

      // Schedule voting phase after round duration
      setTimeout(() => {
        this.startVoting(sessionId, roundNumber);
      }, session.roundDuration * 1000);
    } catch (error) {
      console.error('Start round error:', error);
    }
  }

  async startVoting(sessionId, roundNumber) {
    try {
      const session = await this.prisma.session.findUnique({
        where: { id: sessionId }
      });

      const round = await this.prisma.round.findFirst({
        where: {
          sessionId,
          roundNumber
        }
      });

      if (!round) return;

      await this.prisma.round.update({
        where: { id: round.id },
        data: { status: 'voting' }
      });

      this.io.to(session.code).emit('voting_started', {
        roundNumber,
        votingDuration: 30 // seconds
      });

      console.log(`Voting started for round ${roundNumber} in session ${sessionId}`);

      // Schedule round end
      setTimeout(() => {
        this.endRound(sessionId, roundNumber);
      }, 30 * 1000);
    } catch (error) {
      console.error('Start voting error:', error);
    }
  }

  async submitVote(socket, data) {
    const { roundId, songId } = data;

    if (!roundId || !songId) {
      socket.emit('error', { message: 'Round ID and Song ID are required' });
      return;
    }

    try {
      const participant = await this.prisma.sessionParticipant.findFirst({
        where: {
          sessionId: socket.sessionId,
          userId: socket.userId
        }
      });

      if (!participant) {
        socket.emit('error', { message: 'Participant not found' });
        return;
      }

      // Create or update vote
      const vote = await this.prisma.vote.upsert({
        where: {
          sessionId_userId_round: {
            sessionId: socket.sessionId,
            userId: socket.userId,
            round: roundId
          }
        },
        create: {
          sessionId: socket.sessionId,
          userId: socket.userId,
          songId: songId,
          round: roundId
        },
        update: {
          songId: songId
        }
      });

      socket.emit('vote_submitted', { voteId: vote.id });
      console.log(`Vote submitted by ${socket.userId} for song ${songId}`);
      
    } catch (error) {
      console.error('Submit vote error:', error);
      socket.emit('error', { message: 'Failed to submit vote' });
    }
  }

  async endRound(sessionId, roundNumber) {
    try {
      const session = await this.prisma.session.findUnique({
        where: { id: sessionId }
      });

      const round = await this.prisma.round.findFirst({
        where: {
          sessionId,
          roundNumber
        },
        include: {
          songs: true
        }
      });

      if (!round) return;

      // Get all votes for this round
      const votes = await this.prisma.vote.findMany({
        where: {
          sessionId,
          round: roundNumber
        }
      });

      // Count votes per song
      const voteCounts = {};
      votes.forEach(vote => {
        voteCounts[vote.songId] = (voteCounts[vote.songId] || 0) + 1;
      });

      // Find winner
      let winningSongId = null;
      let maxVotes = 0;
      for (const [songId, count] of Object.entries(voteCounts)) {
        if (count > maxVotes) {
          maxVotes = count;
          winningSongId = songId;
        }
      }

      // Update round status
      await this.prisma.round.update({
        where: { id: round.id },
        data: {
          status: 'completed',
          endedAt: new Date()
        }
      });

      // Update participant score if there's a winner
      if (winningSongId) {
        const winningSong = await this.prisma.song.findUnique({
          where: { id: winningSongId }
        });

        if (winningSong) {
          await this.prisma.sessionParticipant.update({
            where: {
              sessionId_userId: {
                sessionId: sessionId,
                userId: winningSong.submittedBy
              }
            },
            data: {
              score: { increment: 1 }
            }
          });
        }
      }

      // Get updated leaderboard
      const participants = await this.prisma.sessionParticipant.findMany({
        where: { sessionId },
        include: { user: true },
        orderBy: { score: 'desc' }
      });

      this.io.to(session.code).emit('round_ended', {
        roundNumber,
        winningSongId,
        voteCounts,
        leaderboard: participants
      });

      console.log(`Round ${roundNumber} ended in session ${sessionId}`);

      // Check if match should continue (limit to 5 rounds for now)
      if (roundNumber < 5) {
        setTimeout(() => {
          this.createRound(sessionId, roundNumber + 1);
          this.startRound(sessionId, roundNumber + 1);
        }, 5000);
      } else {
        this.endMatch(sessionId);
      }
    } catch (error) {
      console.error('End round error:', error);
    }
  }

  async endMatch(sessionId) {
    try {
      const session = await this.prisma.session.findUnique({
        where: { id: sessionId }
      });

      await this.prisma.session.update({
        where: { id: sessionId },
        data: { status: 'completed' }
      });

      const participants = await this.prisma.sessionParticipant.findMany({
        where: { sessionId },
        include: { user: true },
        orderBy: { score: 'desc' }
      });

      this.io.to(session.code).emit('match_ended', {
        finalLeaderboard: participants
      });

      console.log(`Match ended in session ${sessionId}`);
    } catch (error) {
      console.error('End match error:', error);
    }
  }

  async deckReady(socket, data) {
    const { sessionId, userId } = data;

    if (!sessionId || !userId) {
      socket.emit('error', { message: 'Session ID and User ID are required' });
      return;
    }

    try {
      // Mark participant as ready
      await this.prisma.sessionParticipant.update({
        where: {
          sessionId_userId: {
            sessionId,
            userId
          }
        },
        data: {
          // Add a ready field to the schema if needed
        }
      });

      const session = await this.prisma.session.findUnique({
        where: { id: sessionId }
      });

      const updatedSession = await this.getSessionWithPlayers(sessionId);
      this.io.to(session.code).emit('session_updated', updatedSession);

      console.log(`User ${userId} marked as ready in session ${sessionId}`);
    } catch (error) {
      console.error('Deck ready error:', error);
      socket.emit('error', { message: 'Failed to mark as ready' });
    }
  }

  async getSessionWithPlayers(sessionId) {
    return await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        participants: {
          include: { user: true }
        },
        host: true
      }
    });
  }

  handleDisconnect(socket) {
    const { sessionId, userId } = socket;

    if (sessionId && userId) {
      this.leaveSession(socket, { sessionId, userId });
    }
  }
}

module.exports = SessionManager;
