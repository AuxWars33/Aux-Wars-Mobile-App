const SessionManager = require('./sessionManager');

module.exports = (io, prisma) => {
  const sessionManager = new SessionManager(io, prisma);

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Join session
    socket.on('join_session', async (data) => {
      try {
        await sessionManager.joinSession(socket, data);
      } catch (error) {
        console.error('Error joining session:', error);
        socket.emit('error', { message: 'Failed to join session' });
      }
    });

    // Leave session
    socket.on('leave_session', async (data) => {
      try {
        await sessionManager.leaveSession(socket, data);
      } catch (error) {
        console.error('Error leaving session:', error);
        socket.emit('error', { message: 'Failed to leave session' });
      }
    });

    // Start match
    socket.on('start_match', async (data) => {
      try {
        await sessionManager.startMatch(socket, data);
      } catch (error) {
        console.error('Error starting match:', error);
        socket.emit('error', { message: 'Failed to start match' });
      }
    });

    // Submit vote
    socket.on('submit_vote', async (data) => {
      try {
        await sessionManager.submitVote(socket, data);
      } catch (error) {
        console.error('Error submitting vote:', error);
        socket.emit('error', { message: 'Failed to submit vote' });
      }
    });

    // Deck ready
    socket.on('deck_ready', async (data) => {
      try {
        await sessionManager.deckReady(socket, data);
      } catch (error) {
        console.error('Error marking deck ready:', error);
        socket.emit('error', { message: 'Failed to mark deck ready' });
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
      sessionManager.handleDisconnect(socket);
    });
  });
};
