import express from 'express';
import { prisma } from '../utils/database.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Get chat history for a project (paginated)
router.get('/projects/:id/messages', authMiddleware, async (req, res) => {
  try {
    const rawProjectId = req.params.id;
    const projectId = (Array.isArray(rawProjectId) ? rawProjectId[0] : rawProjectId) ?? '';
    const userId = (req.user as any)?.id as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    // Verify user is a member of the project
    const member = await prisma.projectMember.findFirst({
      where: { projectId, userId },
    });

    if (!member) {
      return res.status(403).json({ error: 'Not a member of this project' });
    }

    const [messages, total] = await Promise.all([
      prisma.chatMessage.findMany({
        where: { projectId },
        include: {
          sender: {
            select: {
              id: true,
              fullName: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
      }),
      prisma.chatMessage.count({ where: { projectId } }),
    ]);

    res.json({
      messages: messages.reverse(), // Return oldest first
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('[API] Get chat messages error:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Clear chat history (Manager only)
router.delete('/projects/:id/messages', authMiddleware, async (req, res) => {
  try {
    const rawProjectId = req.params.id;
    const projectId = (Array.isArray(rawProjectId) ? rawProjectId[0] : rawProjectId) ?? '';
    const userId = (req.user as any)?.id as string;

    // Verify user is a member AND is a MANAGER
    const member = await prisma.projectMember.findFirst({
      where: { projectId, userId },
    });

    if (!member) {
      return res.status(403).json({ error: 'Not a member of this project' });
    }

    if (member.projectRole !== 'MANAGER') {
      return res.status(403).json({ error: 'Only Managers can clear chat history' });
    }

    // Delete all messages in the project
    await prisma.chatMessage.deleteMany({
      where: { projectId },
    });

    res.json({ message: 'Chat history cleared successfully' });
  } catch (error) {
    console.error('[API] Clear chat messages error:', error);
    res.status(500).json({ error: 'Failed to clear messages' });
  }
});

export default router;
