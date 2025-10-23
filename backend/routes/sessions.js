const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { verifyToken } = require('./auth');

const prisma = new PrismaClient();

// Create a new session
router.post('/create', verifyToken, async (req, res) => {
  try {
    const { name, maxPlayers, roundDuration } = req.body;
    const hostId = req.user.userId;

    // Validate input
    if (!name) {
      return res.status(400).json({ error: 'Session name is required' });
    }

    // Generate a unique session code
    const sessionCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    // Create session
    const session = await prisma.session.create({
      data: {
        name,
        code: sessionCode,
        hostId,
        maxPlayers: maxPlayers || 8,
        roundDuration: roundDuration || 30,
        status: 'waiting',
        participants: {
          create: {
            userId: hostId,
            isHost: true
          }
        }
      },
      include: {
        host: {
          select: {
            id: true,
            username: true
          }
        },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                username: true
              }
            }
          }
        }
      }
    });

    res.status(201).json({
      message: 'Session created successfully',
      session
    });
  } catch (error) {
    console.error('Create session error:', error);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

// Join a session by code
router.post('/join', verifyToken, async (req, res) => {
  try {
    const { code } = req.body;
    const userId = req.user.userId;

    // Validate input
    if (!code) {
      return res.status(400).json({ error: 'Session code is required' });
    }

    // Find session
    const session = await prisma.session.findUnique({
      where: { code: code.toUpperCase() },
      include: {
        participants: true
      }
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Check if session is full
    if (session.participants.length >= session.maxPlayers) {
      return res.status(400).json({ error: 'Session is full' });
    }

    // Check if user is already in session
    const existingParticipant = session.participants.find(p => p.userId === userId);
    if (existingParticipant) {
      return res.status(400).json({ error: 'You are already in this session' });
    }

    // Add user to session
    await prisma.sessionParticipant.create({
      data: {
        sessionId: session.id,
        userId,
        isHost: false
      }
    });

    // Fetch updated session
    const updatedSession = await prisma.session.findUnique({
      where: { id: session.id },
      include: {
        host: {
          select: {
            id: true,
            username: true
          }
        },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                username: true
              }
            }
          }
        }
      }
    });

    res.json({
      message: 'Joined session successfully',
      session: updatedSession
    });
  } catch (error) {
    console.error('Join session error:', error);
    res.status(500).json({ error: 'Failed to join session' });
  }
});

// Get session by ID
router.get('/:sessionId', verifyToken, async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        host: {
          select: {
            id: true,
            username: true
          }
        },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                username: true
              }
            }
          }
        },
        rounds: {
          include: {
            songs: true
          }
        }
      }
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({ session });
  } catch (error) {
    console.error('Get session error:', error);
    res.status(500).json({ error: 'Failed to get session' });
  }
});

// Get all active sessions
router.get('/', verifyToken, async (req, res) => {
  try {
    const sessions = await prisma.session.findMany({
      where: {
        status: {
          in: ['waiting', 'active']
        }
      },
      include: {
        host: {
          select: {
            id: true,
            username: true
          }
        },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                username: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({ sessions });
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ error: 'Failed to get sessions' });
  }
});

// Leave a session
router.post('/:sessionId/leave', verifyToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.userId;

    // Remove participant
    await prisma.sessionParticipant.deleteMany({
      where: {
        sessionId,
        userId
      }
    });

    res.json({ message: 'Left session successfully' });
  } catch (error) {
    console.error('Leave session error:', error);
    res.status(500).json({ error: 'Failed to leave session' });
  }
});

// Delete a session (host only)
router.delete('/:sessionId', verifyToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.userId;

    // Check if user is the host
    const session = await prisma.session.findUnique({
      where: { id: sessionId }
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.hostId !== userId) {
      return res.status(403).json({ error: 'Only the host can delete the session' });
    }

    // Delete session (cascade will handle participants)
    await prisma.session.delete({
      where: { id: sessionId }
    });

    res.json({ message: 'Session deleted successfully' });
  } catch (error) {
    console.error('Delete session error:', error);
    res.status(500).json({ error: 'Failed to delete session' });
  }
});

module.exports = router;
