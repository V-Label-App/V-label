import { Router } from 'express';
import { prisma } from '../../utils/database.js';
import { NotificationTemplateService } from '../../services/notification.template.service.js';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { requireRole } from '../../middlewares/role.middleware.js';
import { NotificationType } from '@prisma/client';

const router = Router();

router.use(authMiddleware);
router.use(requireRole(['ADMIN']));

// Get all templates
router.get('/', async (req, res) => {
  try {
    const templates = await NotificationTemplateService.getAllTemplates();
    res.json(templates);
  } catch (error) {
    console.error('Failed to fetch templates:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

// Update specific template
router.put('/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const { titleTemplate, messageTemplate, isActive } = req.body;

    // Validate type
    if (!Object.values(NotificationType).includes(type as NotificationType)) {
      return res.status(400).json({ error: 'Invalid notification type' });
    }

    const updated = await NotificationTemplateService.updateTemplate(type as NotificationType, {
      titleTemplate,
      messageTemplate,
      isActive
    });

    res.json(updated);
  } catch (error) {
    console.error('Failed to update template:', error);
    res.status(500).json({ error: 'Failed to update template' });
  }
});

// Broadcast System Announcement
import { AdminController } from '../../controllers/admin.controller.js';
router.post('/broadcast', AdminController.broadcastAnnouncement);

export default router;
