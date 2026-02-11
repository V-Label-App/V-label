import { prisma } from '../../utils/database.js'
import bcrypt from 'bcryptjs'
import { ResponseFormatter } from './responseFormatter.js'
import { NotificationService } from '../notification.service.js'
import {
  LabelService,
  LabelCategoryService,
  ProjectLabelService,
} from '../label.service.js'
import { ProjectService } from '../project.service.js'
import { broadcastService } from '../../websocket/events/broadcast.service.js'
import { SystemEventType } from '../../websocket/events/types.js'
import { GoogleGenerativeAI } from '@google/generative-ai'

type FunctionImplementation = (params: any, context?: any) => Promise<any>

export interface FunctionMetadata {
  description?: string
  parameters?: any
}

export class FunctionRegistry {
  private static registry = new Map<
    string,
    { fn: FunctionImplementation; metadata: FunctionMetadata }
  >()

  /**
   * Register a function with metadata
   */
  static register(
    name: string,
    fn: FunctionImplementation,
    metadata: FunctionMetadata = {},
  ) {
    this.registry.set(name, { fn, metadata })
  }

  /**
   * Get a function by name
   */
  static get(name: string) {
    return this.registry.get(name)?.fn
  }

  /**
   * Get all registered functions metadata
   */
  static getDefinitions() {
    return Array.from(this.registry.entries()).map(([name, { metadata }]) => ({
      name,
      description: metadata.description || '',
      parameters: metadata.parameters || { type: 'object', properties: {} },
    }))
  }

  /**
   * Execute a function safely
   */
  static async execute(name: string, params: any, context: any) {
    const entry = this.registry.get(name)
    if (!entry) {
      throw new Error(`Function ${name} not found`)
    }
    return await entry.fn(params, context)
  }
}

// ==========================================
// Register Internal Tools
// ==========================================

// 1. Get User Count
// 1. Get User Count
FunctionRegistry.register(
  'get_user_count',
  async (params, context) => {
    const count = await prisma.user.count()

    return ResponseFormatter.asCard({
      title: 'System Users',
      subtitle: 'Total registered users in the system',
      icon: '',
      fields: {
        'Total Users': count,
        Status: count > 0 ? 'Active' : 'Empty',
      },
      variant: 'default',
    })
  },
  {
    description: 'Get the total number of users in the system.',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
)

// 2. Echo (Test)
// 2. Echo (Test)
FunctionRegistry.register(
  'echo_test',
  async (params) => {
    return ResponseFormatter.asText(
      `**Echo Test Result**\n\n` +
      `Received parameters:\n\`\`\`json\n${JSON.stringify(params, null, 2)}\n\`\`\`\n\n` +
      `Timestamp: ${new Date().toLocaleString('vi-VN')}`,
    )
  },
  {
    description: 'Echo back parameters for testing.',
    parameters: {
      type: 'object',
      properties: {
        message: { type: 'string' },
      },
    },
  },
)

// 3. Get Users (List)
FunctionRegistry.register(
  'get_users',
  async (params, context) => {
    // Security: Only allow ADMIN or MANAGER to list users
    if (!['ADMIN', 'MANAGER'].includes(context.userRole)) {
      throw new Error(
        'Permission denied: Only ADMIN and MANAGER can list users.',
      )
    }

    const { role, limit = 5 } = params
    const where: any = {}
    if (role) where.role = role

    const users = await prisma.user.findMany({
      where,
      take: Math.min(Number(limit) || 5, 20), // Max 20 to prevent overload
      select: { email: true, fullName: true, role: true, createdAt: true },
    })

    // Format dates for display
    const formattedUsers = users.map((u) => ({
      Email: u.email,
      'Full Name': u.fullName,
      Role: u.role,
      Created: new Date(u.createdAt).toLocaleDateString('vi-VN'),
    }))

    // Return as interactive table
    return ResponseFormatter.asTable(formattedUsers)
  },
  {
    description:
      'List user details including email, role, and name. Supports filtering by role.',
    parameters: {
      type: 'object',
      properties: {
        role: {
          type: 'string',
          description: 'Filter by role (ADMIN, MANAGER, ANNOTATOR, REVIEWER)',
          enum: ['ADMIN', 'MANAGER', 'ANNOTATOR', 'REVIEWER'],
        },
        limit: {
          type: 'number',
          description: 'Limit number of results (default 5, max 20)',
        },
      },
    },
  },
)

// 4. Create User
FunctionRegistry.register(
  'create_user',
  async (params, context) => {
    // Security: Only ADMIN can create users
    if (context.userRole !== 'ADMIN') {
      throw new Error('Permission denied: Only ADMIN can create new users.')
    }

    const {
      email,
      password,
      fullName,
      phoneNumber,
      role = 'ANNOTATOR',
    } = params

    // If missing required params, return interactive form
    if (!email || !password || !fullName) {
      return ResponseFormatter.asForm({
        id: 'create_user',
        title: 'Create New User',
        description: 'Fill in the details to create a new user account',
        fields: [
          {
            name: 'email',
            type: 'email',
            label: 'Email Address',
            placeholder: 'user@example.com',
            required: true,
          },
          {
            name: 'fullName',
            type: 'text',
            label: 'Full Name',
            placeholder: 'John Doe',
            required: true,
          },
          {
            name: 'password',
            type: 'password',
            label: 'Password',
            placeholder: 'Min 8 characters',
            required: true,
            minLength: 8,
          },
          {
            name: 'phoneNumber',
            type: 'text',
            label: 'Phone Number',
            placeholder: '+84 123 456 789',
            required: false,
          },
          {
            name: 'role',
            type: 'select',
            label: 'Role',
            options: ['ADMIN', 'MANAGER', 'ANNOTATOR', 'REVIEWER'],
            defaultValue: 'ANNOTATOR',
          },
        ],
      })
    }

    // Check existence
    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      throw new Error(`User with email ${email} already exists.`)
    }

    // Hash password
    const salt = await bcrypt.genSalt(10)
    const passwordHash = await bcrypt.hash(password, salt)

    // Create user
    const newUser = await prisma.user.create({
      data: {
        email,
        passwordHash,
        fullName,
        phoneNumber,
        role,
        isActive: true,
        provider: 'LOCAL',
      },
      select: {
        id: true,
        email: true,
        role: true,
        fullName: true,
        phoneNumber: true,
      },
    })

    // Return success card
    return ResponseFormatter.asCard({
      title: '✅ User Created Successfully',
      variant: 'success',
      fields: {
        Email: newUser.email,
        'Full Name': newUser.fullName,
        Role: newUser.role,
      },
      actions: [
        {
          label: 'Xem tất cả người dùng',
          action: 'Xem tất cả người dùng',
          variant: 'primary',
        },
        {
          label: 'Tạo người dùng mới',
          action: 'Tạo người dùng mới',
          variant: 'secondary',
        },
      ],
    })
  },
  {
    description:
      "Create a new user account. IMPORTANT: Call this function IMMEDIATELY when user wants to create a user, even if they haven't provided email, password, or name yet. The function will automatically show an interactive form to collect any missing information. Do NOT ask the user for details - just call this function right away.",
    parameters: {
      type: 'object',
      properties: {
        email: {
          type: 'string',
          description:
            'User email address (optional - form will ask if missing)',
        },
        password: {
          type: 'string',
          description:
            'User password min 8 chars (optional - form will ask if missing)',
        },
        fullName: {
          type: 'string',
          description: 'User full name (optional - form will ask if missing)',
        },
        phoneNumber: {
          type: 'string',
          description: 'User phone number (optional)',
        },
        role: {
          type: 'string',
          description:
            'User role: ADMIN, MANAGER, ANNOTATOR, REVIEWER (optional - defaults to ANNOTATOR)',
          enum: ['ADMIN', 'MANAGER', 'ANNOTATOR', 'REVIEWER'],
        },
      },
      // No required fields - function shows form for missing params
    },
  },
)

// 5. Send System Announcement (Admin only)
FunctionRegistry.register(
  'send_system_announcement',
  async (params, context) => {
    // Security: Only ADMIN can send system announcements
    if (context.userRole !== 'ADMIN') {
      throw new Error(
        'Permission denied: Only ADMIN can send system announcements.',
      )
    }

    let { title, message, targetType, targetRoles, targetEmails } = params

    // Smart detection: if title looks like a role, it's probably the target, not the title
    const roleKeywords = [
      'manager',
      'admin',
      'annotator',
      'reviewer',
      'quản lý',
      'người đánh giá',
    ]
    if (
      title &&
      roleKeywords.some((r) => title.toLowerCase().includes(r)) &&
      !message
    ) {
      // User probably said "send to manager" and AI put "manager" as title
      // Extract role and clear title
      const roleMap: Record<string, string> = {
        manager: 'MANAGER',
        'quản lý': 'MANAGER',
        admin: 'ADMIN',
        annotator: 'ANNOTATOR',
        reviewer: 'REVIEWER',
        'người đánh giá': 'REVIEWER',
      }

      for (const [keyword, role] of Object.entries(roleMap)) {
        if (title.toLowerCase().includes(keyword)) {
          targetType = 'roles'
          targetRoles = role
          title = '' // Clear so form asks for real title
          break
        }
      }
    }

    // If missing required params (title/message), return interactive form
    // But only show target fields if target is not already determined
    if (!title || !message) {
      const fields: any[] = [
        {
          name: 'title',
          type: 'text',
          label: 'Announcement Title',
          placeholder: 'e.g. System Maintenance Notice',
          required: true,
        },
        {
          name: 'message',
          type: 'textarea',
          label: 'Message Content',
          placeholder: 'Enter the announcement message...',
          required: true,
        },
      ]

      // Only show target selection if not already determined from user's message
      if (!targetType && !targetRoles && !targetEmails) {
        fields.push(
          {
            name: 'targetType',
            type: 'select',
            label: 'Send To',
            options: ['all', 'roles', 'emails'],
            defaultValue: 'all',
            helpText: 'Choose who receives this announcement',
          },
          {
            name: 'targetRoles',
            type: 'text',
            label: 'Target Roles (if "roles" selected)',
            placeholder: 'ANNOTATOR, REVIEWER, MANAGER',
            helpText: 'Comma-separated roles',
          },
          {
            name: 'targetEmails',
            type: 'textarea',
            label: 'Target Emails (if "emails" selected)',
            placeholder: 'user1@example.com, user2@example.com',
            helpText: 'Comma-separated email addresses',
          },
        )
      }

      // Build description showing who will receive
      let targetDesc = 'Send a notification'
      if (targetType === 'roles' && targetRoles) {
        targetDesc = `Send notification to: ${targetRoles.toUpperCase()}`
      } else if (targetType === 'emails' && targetEmails) {
        targetDesc = `Send notification to: ${targetEmails}`
      } else if (targetType === 'all') {
        targetDesc = 'Send notification to ALL users'
      }

      return ResponseFormatter.asForm({
        id: 'send_system_announcement',
        title: 'Send System Announcement',
        description: targetDesc,
        fields,
      })
    }

    // Parse targeting options
    let options: { targetRoles?: string[]; targetEmails?: string[] } = {}

    if (targetType === 'roles' && targetRoles) {
      options.targetRoles = targetRoles
        .split(',')
        .map((r: string) => r.trim().toUpperCase())
        .filter(Boolean)
    } else if (targetType === 'emails' && targetEmails) {
      options.targetEmails = targetEmails
        .split(',')
        .map((e: string) => e.trim().toLowerCase())
        .filter(Boolean)
    }

    // Send the announcement
    const result = await NotificationService.createTargetedAnnouncement(
      title,
      message,
      context.userId,
      options,
    )

    // Build recipient description
    let recipientDesc = 'All users'
    if (options.targetRoles && options.targetRoles.length > 0) {
      recipientDesc = `Roles: ${options.targetRoles.join(', ')}`
    } else if (options.targetEmails && options.targetEmails.length > 0) {
      recipientDesc = `${options.targetEmails.length} specific user(s)`
    }

    // Return success card
    return ResponseFormatter.asCard({
      title: '📢 Announcement Sent Successfully',
      variant: 'success',
      fields: {
        Title: title,
        Message:
          message.length > 100 ? message.substring(0, 100) + '...' : message,
        Target: recipientDesc,
        Recipients: `${result.count} users`,
      },
      actions: [
        {
          label: 'Gửi thông báo khác',
          action: 'Gửi thông báo hệ thống',
          variant: 'primary',
        },
      ],
    })
  },
  {
    description: `Send an announcement/notification to users. IMPORTANT: Extract target from user's message automatically!

Examples:
- "Gửi thông báo cho manager" → targetType="roles", targetRoles="MANAGER"
- "Thông báo cho annotator và reviewer" → targetType="roles", targetRoles="ANNOTATOR, REVIEWER"
- "Gửi cho user@example.com" → targetType="emails", targetEmails="user@example.com"
- "Thông báo cho tất cả" → targetType="all"
- "Gửi thông báo hệ thống" (no specific target) → show form to ask

If user mentions a ROLE (manager, annotator, reviewer, admin), set targetType="roles" and targetRoles accordingly.
If user mentions an EMAIL, set targetType="emails" and targetEmails accordingly.
If user says "all" or "everyone" or "tất cả", set targetType="all".
Only show form for title/message if not provided. DO NOT ask for targetType/targetRoles if already clear from context.`,
    parameters: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Announcement title (show form if missing)',
        },
        message: {
          type: 'string',
          description: 'Announcement message content (show form if missing)',
        },
        targetType: {
          type: 'string',
          description:
            'Auto-detect from user message: "all", "roles", or "emails"',
          enum: ['all', 'roles', 'emails'],
        },
        targetRoles: {
          type: 'string',
          description:
            'Auto-extract roles mentioned: ADMIN, MANAGER, REVIEWER, ANNOTATOR',
        },
        targetEmails: {
          type: 'string',
          description: 'Auto-extract emails mentioned in user message',
        },
      },
    },
  },
)

// 6. Suggest Labels (Preview)
FunctionRegistry.register(
  'suggest_labels',
  async (params) => {
    const { categoryName, labels } = params

    return ResponseFormatter.asCard({
      title: '📋 Label Suggestion Plan',
      subtitle: `Suggested labels for category: ${categoryName}`,
      variant: 'default',
      fields: {
        Category: categoryName,
        'Label Count': labels.length,
        Labels:
          labels.length <= 15
            ? labels.join(', ')
            : labels.slice(0, 15).join(', ') + ` (+${labels.length - 15} more)`,
      },
      data: {
        type: 'label_suggestion',
        categoryName,
        labels,
      },
    })
  },
  {
    description:
      'Suggest a list of label names and colors. Use this when the user wants to see a preview of labels before creating them.',
    parameters: {
      type: 'object',
      properties: {
        categoryName: {
          type: 'string',
          description: 'Name of the category for these labels',
        },
        labels: {
          type: 'array',
          items: {
            type: 'string',
            description: 'Label name',
          },
          description: 'A list of label names to suggest',
        },
      },
      required: ['categoryName', 'labels'],
    },
  },
)

// 7. Create Labels Automatically (Manager/Admin only)
FunctionRegistry.register(
  'create_labels_auto',
  async (params, context) => {
    // Security: Only MANAGER or ADMIN can create labels
    if (context.userRole !== 'MANAGER' && context.userRole !== 'ADMIN') {
      throw new Error(
        'Permission denied: Only MANAGER or ADMIN can create labels.',
      )
    }

    const { categoryName, categoryDescription, labels, useExistingCategory } =
      params

    // Validate: need either labels array or will show form
    if (!labels || !Array.isArray(labels) || labels.length === 0) {
      return ResponseFormatter.asText(
        `Vui lòng cho tôi biết bạn muốn tạo những label gì. Ví dụ:\n` +
        `- "Tạo category Animals với các label: Dog, Cat, Bird, Fish, Rabbit"\n` +
        `- "Tạo 10 label con vật dưới nước trong category Sea Animals"\n` +
        `- "Thêm các label Xe máy, Ô tô, Xe đạp vào category Vehicles"\n\n` +
        `Tôi sẽ tự động tạo category (nếu chưa có) và các label cho bạn.`,
      )
    }

    const results = {
      categoryCreated: false,
      categoryName: '',
      categoryId: '',
      labelsCreated: [] as string[],
      labelsSkipped: [] as { name: string; reason: string }[],
      errors: [] as string[],
    }

    try {
      // Step 1: Handle Category
      let targetCategoryId: string | null = null

      if (categoryName) {
        // Check if category already exists
        const existingCategories = await LabelCategoryService.getAll()

        // Smart category matching: exact match or keyword match
        const categoryKeywordMap: Record<string, string[]> = {
          'xe cộ': ['vehicle', 'vehicles', 'phương tiện'],
          'động vật': ['animal', 'animals', 'con vật'],
          'hoa quả': ['fruit', 'fruits', 'trái cây'],
          'rau củ': ['vegetable', 'vegetables'],
          biển: ['sea', 'ocean', 'marine'],
          'cây cối': ['tree', 'trees', 'plant', 'plants'],
          'đồ ăn': ['food', 'foods', 'món ăn'],
          'đồ uống': ['drink', 'drinks', 'beverage'],
          'nhà cửa': ['house', 'building', 'buildings'],
          'quần áo': ['clothing', 'clothes', 'apparel'],
        }

        let matchedCategory = existingCategories.find(
          (c) => c.name.toLowerCase() === categoryName.toLowerCase(),
        )

        // If no exact match, try keyword matching
        if (!matchedCategory) {
          const lowerCategoryName = categoryName.toLowerCase()
          for (const [vietnameseKey, englishKeywords] of Object.entries(
            categoryKeywordMap,
          )) {
            if (
              lowerCategoryName.includes(vietnameseKey) ||
              englishKeywords.some((kw) => lowerCategoryName.includes(kw))
            ) {
              // Find existing category that matches these keywords
              matchedCategory = existingCategories.find(
                (c) =>
                  englishKeywords.some((kw) =>
                    c.name.toLowerCase().includes(kw),
                  ) || c.name.toLowerCase().includes(vietnameseKey),
              )
              if (matchedCategory) break
            }
          }
        }

        if (matchedCategory) {
          if (useExistingCategory === false) {
            // User explicitly doesn't want to use existing
            results.errors.push(
              `Category "${matchedCategory.name}" already exists. Set useExistingCategory=true to add labels to it.`,
            )
            return ResponseFormatter.asCard({
              title: '⚠️ Category Already Exists',
              variant: 'warning',
              fields: {
                'Existing Category': matchedCategory.name,
                'You Requested': categoryName,
                Suggestion:
                  'Use the existing category or choose a different name',
              },
              actions: [
                {
                  label: 'Use Existing Category',
                  action: `Thêm labels vào category ${matchedCategory.name}`,
                  variant: 'primary',
                },
                {
                  label: 'Choose Different Name',
                  action: 'Tạo category mới với tên khác',
                  variant: 'secondary',
                },
              ],
            })
          }
          // Use existing category
          targetCategoryId = matchedCategory.id
          results.categoryName = matchedCategory.name
          results.categoryId = matchedCategory.id
        } else {
          // Create new category
          const newCategory = await LabelCategoryService.create({
            name: categoryName,
            description:
              categoryDescription ||
              `Auto-generated category for ${categoryName}`,
          })
          targetCategoryId = newCategory.id
          results.categoryCreated = true
          results.categoryName = newCategory.name
          results.categoryId = newCategory.id
        }
      }

      // Step 2: Create Labels
      // Get existing labels to check for duplicates
      const existingLabels = await LabelService.getAll()
      const existingLabelNames = existingLabels.map((l) => l.name.toLowerCase())

      // Generate colors palette
      const colorPalette = [
        '#EF4444',
        '#F97316',
        '#F59E0B',
        '#EAB308',
        '#84CC16',
        '#22C55E',
        '#10B981',
        '#14B8A6',
        '#06B6D4',
        '#0EA5E9',
        '#3B82F6',
        '#6366F1',
        '#8B5CF6',
        '#A855F7',
        '#D946EF',
        '#EC4899',
        '#F43F5E',
        '#78716C',
        '#64748B',
        '#0F172A',
      ]

      for (let i = 0; i < labels.length; i++) {
        const labelData = labels[i]
        const labelName =
          typeof labelData === 'string' ? labelData : labelData.name
        let labelColor =
          typeof labelData === 'object' && labelData.color
            ? labelData.color
            : null

        // Skip empty names
        if (!labelName || labelName.trim() === '') {
          continue
        }

        // Check for duplicate
        if (existingLabelNames.includes(labelName.toLowerCase())) {
          results.labelsSkipped.push({
            name: labelName,
            reason: 'Already exists',
          })
          continue
        }

        // Generate color if not provided
        if (!labelColor || !/^#[0-9A-Fa-f]{6}$/.test(labelColor)) {
          labelColor = colorPalette[i % colorPalette.length]
        }

        try {
          const createData: {
            name: string
            color: string
            isGlobal: boolean
            categoryId?: string
            createdBy: string
          } = {
            name: labelName.trim(),
            color: labelColor,
            isGlobal: true,
            createdBy: context.userId,
          }
          if (targetCategoryId) {
            createData.categoryId = targetCategoryId
          }
          await LabelService.create(createData)
          results.labelsCreated.push(labelName)
          existingLabelNames.push(labelName.toLowerCase()) // Add to list to prevent duplicates within same batch
        } catch (err: any) {
          if (err.code === 'P2002') {
            results.labelsSkipped.push({
              name: labelName,
              reason: 'Duplicate name',
            })
          } else {
            results.errors.push(
              `Failed to create "${labelName}": ${err.message}`,
            )
          }
        }
      }

      // Step 3: Build response
      if (results.labelsCreated.length === 0 && results.errors.length === 0) {
        return ResponseFormatter.asCard({
          title: '⚠️ No Labels Created',
          variant: 'warning',
          fields: {
            Reason: 'All labels already exist or were invalid',
            Skipped:
              results.labelsSkipped
                .map((s) => `${s.name} (${s.reason})`)
                .join(', ') || 'None',
          },
        })
      }

      const summaryFields: Record<string, any> = {}

      if (results.categoryCreated) {
        summaryFields['Category Created'] = results.categoryName
      } else if (results.categoryName) {
        summaryFields['Category Used'] = results.categoryName
      }

      summaryFields['Labels Created'] =
        results.labelsCreated.length > 0
          ? `${results.labelsCreated.length} labels`
          : 'None'

      if (results.labelsCreated.length > 0) {
        summaryFields['Label Names'] =
          results.labelsCreated.length <= 10
            ? results.labelsCreated.join(', ')
            : results.labelsCreated.slice(0, 10).join(', ') +
            ` (+${results.labelsCreated.length - 10} more)`
      }

      if (results.labelsSkipped.length > 0) {
        summaryFields['Skipped'] =
          results.labelsSkipped.length <= 5
            ? results.labelsSkipped.map((s) => s.name).join(', ')
            : `${results.labelsSkipped.length} labels (already exist)`
      }

      if (results.errors.length > 0) {
        summaryFields['Errors'] = results.errors.join('; ')
      }

      // Broadcast event to all users so Label Management page can auto-refresh
      if (results.labelsCreated.length > 0) {
        broadcastService.broadcastToAll(
          SystemEventType.LABEL_CREATED,
          {
            count: results.labelsCreated.length,
            categoryName: results.categoryName,
            categoryCreated: results.categoryCreated,
            labels: results.labelsCreated,
            triggeredBy: context.userId,
            source: 'ai', // Indicates this is from AI function call
          },
          context.userId,
        )
        console.log(
          '[Function] Broadcasted LABEL_CREATED event:',
          results.labelsCreated.length,
          'labels',
        )
      }

      return ResponseFormatter.asCard({
        title: 'Labels Created Successfully',
        variant: 'success',
        fields: summaryFields,
        actions: [
          {
            label: 'Tạo thêm labels',
            action: 'Tạo thêm labels mới',
            variant: 'primary',
          },
          {
            label: 'Xem tất cả labels',
            action: 'Xem danh sách labels',
            variant: 'secondary',
          },
        ],
      })
    } catch (error: any) {
      return ResponseFormatter.asCard({
        title: '❌ Failed to Create Labels',
        variant: 'error',
        fields: {
          Error: error.message,
          'Created Before Error': results.labelsCreated.join(', ') || 'None',
        },
      })
    }
  },
  {
    description: `Automatically create GLOBAL labels and categories. IMPORTANT: Labels are GLOBAL system resources, NOT tied to specific projects!

DO NOT ASK about projects - labels are created at system level and can be used in any project.

CRITICAL WORKFLOW:
1. If user says "thêm vào category" or "add to existing", FIRST call get_label_categories to see what exists
2. Use the EXACT category name from get_label_categories result
3. Set useExistingCategory=true when adding to existing category
4. NEVER ask which project - labels are global!

USAGE EXAMPLES:
1. "Tạo category Animals với 10 con vật phổ biến" → AI generates: categoryName="Animals", labels=["Dog", "Cat", "Bird", ...]
2. "Tạo 5 label phương tiện giao thông" → AI generates: categoryName="Vehicles", labels=["Car", "Motorcycle", "Bicycle", "Bus", "Truck"]
3. "Thêm labels vào category xe cộ" → FIRST call get_label_categories, see "Vehicles" exists → categoryName="Vehicles", useExistingCategory=true
4. "Tạo category Sea Animals với các loài cá: Cá mập, Cá heo, Cá voi" → categoryName="Sea Animals", labels=["Cá mập", "Cá heo", "Cá voi"]

IMPORTANT RULES FOR AI:
- When user says "thêm vào" or "add to", call get_label_categories FIRST
- ALWAYS generate the labels array based on user's description (e.g., "10 common animals" → generate 10 animal names)
- Use Vietnamese names if user speaks Vietnamese, English if user speaks English
- Generate diverse, relevant labels based on the category/theme
- Assign colors automatically (function handles this)
- Match Vietnamese category names to English equivalents: "xe cộ" → "Vehicles", "động vật" → "Animals"`,
    parameters: {
      type: 'object',
      properties: {
        categoryName: {
          type: 'string',
          description:
            'Name of category to create or use. Extract from user message or generate based on theme.',
        },
        categoryDescription: {
          type: 'string',
          description: 'Optional description for new category',
        },
        labels: {
          type: 'array',
          items: {
            oneOf: [
              { type: 'string' },
              {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  color: {
                    type: 'string',
                    description: 'Hex color like #FF0000',
                  },
                },
                required: ['name'],
              },
            ],
          },
          description:
            'Array of label names to create. AI MUST generate this based on user description (e.g., "10 animals" → generate 10 animal names)',
        },
        useExistingCategory: {
          type: 'boolean',
          description:
            'If true, add labels to existing category with same name. If false/undefined and category exists, show warning.',
        },
      },
      required: ['labels'],
    },
  },
)

// 7. Get Existing Categories (to help AI choose correct category)
FunctionRegistry.register(
  'get_label_categories',
  async (params, context) => {
    // Available for Manager, Admin
    if (!['MANAGER', 'ADMIN'].includes(context.userRole)) {
      throw new Error(
        'Permission denied: Only MANAGER or ADMIN can view label categories.',
      )
    }

    try {
      const categories = await LabelCategoryService.getAll()

      if (categories.length === 0) {
        return {
          categories: [],
          message:
            'No categories found. You can create one using create_labels_auto function.',
        }
      }

      // Return simple object that AI can easily parse
      return {
        categories: categories.map((cat) => ({
          name: cat.name,
          description: cat.description || '',
          labelCount: cat._count?.labels || 0,
        })),
        message: `Found ${categories.length} existing categories. Use these EXACT names when calling create_labels_auto.`,
      }
    } catch (error: any) {
      throw new Error(`Error fetching categories: ${error.message}`)
    }
  },
  {
    description: `Get list of existing label categories. IMPORTANT: Call this BEFORE create_labels_auto when user wants to add labels to existing category.

WORKFLOW:
1. User says "thêm vào category xe cộ" → Call get_label_categories
2. Response will have categories array with {name, description, labelCount}
3. Find matching category (e.g., "Vehicles" for "xe cộ")
4. Use EXACT category name in create_labels_auto

RESPONSE FORMAT:
{
  categories: [{name: "Animals", description: "...", labelCount: 5}, ...],
  message: "Found N categories..."
}

After calling this, ALWAYS respond to user with the list of categories found, then proceed with their request.`,
    parameters: {
      type: 'object',
      properties: {},
    },
  },
)

// 8. Get All Labels in System (Manager/Admin)
FunctionRegistry.register(
  'get_all_labels',
  async (params, context) => {
    // Available for Manager, Admin (and maybe Reviewer/Annotator for read)
    if (
      !['MANAGER', 'ADMIN', 'REVIEWER', 'ANNOTATOR'].includes(context.userRole)
    ) {
      throw new Error('Permission denied.')
    }

    const { categoryId, search, limit = 50 } = params

    try {
      const filters: any = {}
      if (categoryId) {
        filters.categoryId = categoryId
      }
      if (search) {
        filters.search = search
      }

      let labels = await LabelService.getAll(filters)

      // Apply limit
      if (limit && limit > 0) {
        labels = labels.slice(0, limit)
      }

      if (labels.length === 0) {
        return {
          labels: [],
          total: 0,
          message: 'No labels found in the system.',
        }
      }

      // Group by category for better presentation
      const groupedByCategory: Record<string, any[]> = {}
      const uncategorized: any[] = []

      labels.forEach((label) => {
        const categoryName = label.category?.name || 'Uncategorized'
        if (!label.category) {
          uncategorized.push({
            name: label.name,
            color: label.color,
            isGlobal: label.isGlobal,
          })
        } else {
          if (!groupedByCategory[categoryName]) {
            groupedByCategory[categoryName] = []
          }
          groupedByCategory[categoryName].push({
            name: label.name,
            color: label.color,
            isGlobal: label.isGlobal,
          })
        }
      })

      return {
        labels: labels.map((l) => ({
          name: l.name,
          color: l.color,
          category: l.category?.name || null,
          isGlobal: l.isGlobal,
        })),
        groupedByCategory,
        uncategorized,
        total: labels.length,
        message: `Found ${labels.length} labels in the system. These are GLOBAL labels available for all projects.`,
      }
    } catch (error: any) {
      throw new Error(`Error fetching labels: ${error.message}`)
    }
  },
  {
    description: `Get all labels in the system. IMPORTANT: Labels are GLOBAL and NOT tied to specific projects.

Use cases:
- User asks "xem các nhãn trong hệ thống" → Call this (no project needed!)
- User asks "có label nào" → Call this
- User wants to see labels in a category → Call this with categoryId

CRITICAL: Labels are GLOBAL resources. They are created once and can be used in ANY project. Do NOT ask user about which project - labels exist at system level.

RESPONSE FORMAT:
{
  labels: [{name: "Dog", color: "#FF0000", category: "Animals", isGlobal: true}, ...],
  groupedByCategory: {"Animals": [...], "Vehicles": [...]},
  total: 15,
  message: "..."
}`,
    parameters: {
      type: 'object',
      properties: {
        categoryId: {
          type: 'string',
          description: 'Optional: Filter by category ID',
        },
        search: {
          type: 'string',
          description: 'Optional: Search labels by name',
        },
        limit: {
          type: 'number',
          description: 'Optional: Limit number of results (default 50)',
        },
      },
    },
  },
)

// ============================================================================
// PROJECT MANAGEMENT WITH SMART LABEL SUGGESTIONS
// ============================================================================

/**
 * Function 1: Suggest labels for a new project based on description
 */
FunctionRegistry.register(
  'suggest_labels_for_project',
  async (params, context) => {
    // Security: Only MANAGER or ADMIN can create projects
    if (!['MANAGER', 'ADMIN'].includes(context.userRole)) {
      throw new Error(
        'Permission denied: Only MANAGER or ADMIN can create projects.',
      )
    }

    const { projectDescription } = params

    if (!projectDescription || projectDescription.trim().length === 0) {
      return ResponseFormatter.asText(
        '❌ Vui lòng mô tả project bạn muốn tạo. Ví dụ: "Tôi muốn tạo project nhận diện các loại xe cộ trên đường"',
      )
    }

    // Step 1: Get all existing labels from database
    console.log('[suggest_labels_for_project] Fetching all existing labels...')
    const allLabels = await LabelService.getAll()

    if (allLabels.length === 0) {
      return ResponseFormatter.asCard({
        title: '⚠️ No Labels Available',
        variant: 'warning',
        fields: {
          Message:
            'Hệ thống chưa có labels nào. Vui lòng tạo labels trước khi tạo project.',
        },
        actions: [
          {
            label: 'Tạo labels',
            action: 'create_labels_auto',
            variant: 'primary',
          },
        ],
      })
    }

    // Step 2: Use Gemini AI to semantically match labels with project description
    console.log(
      `[suggest_labels_for_project] Matching ${allLabels.length} labels with description...`,
    )

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY not configured')
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })

    // Build label list for Gemini
    const labelList = allLabels
      .map((label, idx) => {
        const categoryInfo = label.category
          ? ` (Category: ${label.category.name})`
          : ''
        return `${idx + 1}. ${label.name}${categoryInfo}`
      })
      .join('\n')

    const matchingPrompt = `You are an expert in computer vision and image annotation projects.

Given the following list of available labels in the system:
${labelList}

Project Description: "${projectDescription}"

Task: Select the most relevant labels for this project. Return ONLY a JSON array of label names that are semantically related to the project description.

Rules:
- Return ONLY label names that exist in the provided list
- Select 3-10 labels maximum (prioritize most relevant)
- If description mentions specific objects, include them
- Consider semantic similarity (e.g., "traffic" → "Car", "Bus", "Truck")
- Return ONLY valid JSON array format: ["Label1", "Label2", ...]
- Do not explain, just return the JSON array

Example:
Input: "detect animals in wildlife"
Output: ["Dog", "Cat", "Bird", "Horse"]`

    try {
      const result = await model.generateContent(matchingPrompt)
      const responseText = result.response.text().trim()

      console.log(
        '[suggest_labels_for_project] Gemini response:',
        responseText,
      )

      // Parse JSON response
      let suggestedLabelNames: string[] = []
      try {
        // Extract JSON array from response (handle markdown code blocks)
        const jsonMatch = responseText.match(/\[[\s\S]*\]/)
        if (jsonMatch) {
          suggestedLabelNames = JSON.parse(jsonMatch[0])
        } else {
          suggestedLabelNames = JSON.parse(responseText)
        }
      } catch (parseError) {
        console.error(
          '[suggest_labels_for_project] Failed to parse Gemini response:',
          parseError,
        )
        throw new Error('Failed to parse AI response. Please try again.')
      }

      if (
        !Array.isArray(suggestedLabelNames) ||
        suggestedLabelNames.length === 0
      ) {
        return ResponseFormatter.asCard({
          title: '⚠️ No Matching Labels Found',
          variant: 'warning',
          fields: {
            'Project Description': projectDescription,
            Message:
              'Không tìm thấy labels phù hợp với mô tả này. Vui lòng thử mô tả chi tiết hơn hoặc tạo labels mới.',
          },
          actions: [
            {
              label: 'Tạo labels mới',
              action: 'create_labels_auto',
              variant: 'primary',
            },
          ],
        })
      }

      // Step 3: Get full label details
      const suggestedLabels = allLabels.filter((label) =>
        suggestedLabelNames.includes(label.name),
      )

      console.log(
        `[suggest_labels_for_project] Matched ${suggestedLabels.length} labels:`,
        suggestedLabels.map((l) => l.name),
      )

      // Step 4: Format response with label preview
      const labelDetails = suggestedLabels
        .map((label) => {
          const categoryInfo = label.category
            ? ` (${label.category.name})`
            : ' (Uncategorized)'
          return `• **${label.name}**${categoryInfo} - ${label.color}`
        })
        .join('\n')

      return ResponseFormatter.asCard({
        title: '✨ Suggested Labels for Your Project',
        variant: 'default',
        fields: {
          'Project Description': projectDescription,
          'Suggested Labels Count': `${suggestedLabels.length} labels`,
          Labels: labelDetails,
          '':
            '\n**Bước tiếp theo:** Nếu bạn đồng ý với các labels này, hãy xác nhận để tôi tạo project!',
        },
        actions: [
          {
            label: '✅ Tạo project với labels này',
            action: `create_project_with_smart_labels`,
            variant: 'primary',
            data: {
              projectDescription: projectDescription,
              labelIds: suggestedLabels.map((l) => l.id),
            },
          },
          {
            label: '🔄 Chọn lại labels',
            action: 'suggest_labels_for_project',
            variant: 'secondary',
          },
        ],
      })
    } catch (error: any) {
      console.error('[suggest_labels_for_project] Error:', error)
      throw new Error(`Failed to suggest labels: ${error.message}`)
    }
  },
  {
    description: `Suggest relevant labels for a new project based on its description.

This function uses AI to semantically match existing labels in the system with the project description.

Use cases:
- User wants to create a project and needs label suggestions
- User describes what they want to label (e.g., "detect traffic", "classify flowers")
- Returns preview of suggested labels for user confirmation

Workflow:
1. User describes project idea
2. AI matches with existing labels
3. Returns suggested labels + confirmation prompt
4. User confirms → proceeds to create_project_with_smart_labels

IMPORTANT: This only suggests EXISTING labels. It does NOT create new labels.`,
    parameters: {
      type: 'object',
      properties: {
        projectDescription: {
          type: 'string',
          description:
            'Description of what the project will label. Can be in natural language. Examples: "nhận diện xe cộ", "detect flowers", "phân loại thú cưng"',
        },
      },
      required: ['projectDescription'],
    },
  },
)

/**
 * Function 2: Create project with smart-formatted name/description and assign labels
 */
FunctionRegistry.register(
  'create_project_with_smart_labels',
  async (params, context) => {
    // Security: Only MANAGER or ADMIN can create projects
    if (!['MANAGER', 'ADMIN'].includes(context.userRole)) {
      throw new Error(
        'Permission denied: Only MANAGER or ADMIN can create projects.',
      )
    }

    const {
      projectIdea,
      projectDescription, // From suggest_labels_for_project
      labelIds,
      categoryId,
      deadline,
      enableAiAssistance = true,
    } = params

    // Use projectDescription if provided (from suggestion flow), otherwise use projectIdea
    const rawDescription = projectDescription || projectIdea

    if (!rawDescription || rawDescription.trim().length === 0) {
      return ResponseFormatter.asText(
        '❌ Vui lòng cung cấp mô tả project. Ví dụ: "Tạo project detect traffic"',
      )
    }

    if (!labelIds || !Array.isArray(labelIds) || labelIds.length === 0) {
      return ResponseFormatter.asText(
        '❌ Vui lòng chọn ít nhất 1 label cho project. Sử dụng `suggest_labels_for_project` để được gợi ý labels.',
      )
    }

    // Step 1: Use Gemini to format professional project name and description
    console.log(
      '[create_project_with_smart_labels] Formatting project name and description with AI...',
    )

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY not configured')
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })

    const formattingPrompt = `You are a project management expert. Format the user's raw project idea into a professional project.

User's raw idea: "${rawDescription}"

Task: Return a JSON object with:
{
  "name": "Professional project name (3-6 words, title case)",
  "description": "Clear 1-2 sentence description of what this project will annotate/label"
}

Rules:
- name: Short, clear, professional (e.g., "Traffic Detection System", "Flower Classification Dataset")
- description: Explain what will be labeled, why, and scope (1-2 sentences)
- Keep Vietnamese if user's input was Vietnamese
- Return ONLY valid JSON, no explanation

Example:
Input: "tạo project detect traffic"
Output: {"name": "Traffic Detection Project", "description": "Một dự án computer vision để phát hiện và phân loại các phương tiện giao thông bao gồm ô tô, xe buýt, xe tải và xe máy trên đường phố."}`

    let formattedName: string
    let formattedDescription: string

    try {
      const result = await model.generateContent(formattingPrompt)
      const responseText = result.response.text().trim()

      console.log(
        '[create_project_with_smart_labels] Formatting response:',
        responseText,
      )

      // Parse JSON response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No JSON found in response')
      }

      const formatted = JSON.parse(jsonMatch[0])
      formattedName = formatted.name || rawDescription
      formattedDescription =
        formatted.description || `Project for ${rawDescription}`
    } catch (error) {
      console.error(
        '[create_project_with_smart_labels] Failed to format with AI, using defaults:',
        error,
      )
      // Fallback to simple formatting
      formattedName = rawDescription
        .slice(0, 50)
        .replace(/^(tạo project|create project)/i, '')
        .trim()
      formattedDescription = `A computer vision project for ${rawDescription}`
    }

    // Step 2: Check if need to ask for additional info
    const missingInfo: string[] = []
    if (!categoryId) missingInfo.push('category')
    if (!deadline) missingInfo.push('deadline')

    if (missingInfo.length > 0 && !params._skipQuestions) {
      // Ask user for missing info
      const questions = []
      if (!categoryId) {
        questions.push(
          '• **Project Category**: Bạn muốn project thuộc category nào? (Object Detection, Image Classification, Segmentation, hoặc để trống)',
        )
      }
      if (!deadline) {
        questions.push(
          '• **Deadline**: Bạn có muốn đặt deadline không? (Ví dụ: "30 ngày", "2 tuần", hoặc để trống)',
        )
      }

      return ResponseFormatter.asCard({
        title: '📋 Project Information',
        variant: 'default',
        fields: {
          'Project Name': formattedName,
          Description: formattedDescription,
          Labels: `${labelIds.length} labels đã chọn`,
          'Missing Info':
            'Vui lòng cung cấp thêm thông tin sau (có thể bỏ qua):',
          Questions: questions.join('\n'),
        },
        actions: [
          {
            label: '✅ Tạo project ngay (bỏ qua câu hỏi)',
            action: 'create_project_with_smart_labels',
            variant: 'primary',
            data: {
              ...params,
              _skipQuestions: true,
            },
          },
          {
            label: '❌ Huỷ',
            action: 'cancel',
            variant: 'secondary',
          },
        ],
      })
    }

    // Step 3: Parse deadline if provided
    let parsedDeadline: Date | undefined
    if (deadline && typeof deadline === 'string') {
      try {
        // Parse relative deadline (e.g., "30 ngày", "2 tuần")
        const daysMatch = deadline.match(/(\d+)\s*(ngày|day|days)/i)
        const weeksMatch = deadline.match(/(\d+)\s*(tuần|week|weeks)/i)

        if (daysMatch && daysMatch[1]) {
          const days = parseInt(daysMatch[1])
          parsedDeadline = new Date()
          parsedDeadline.setDate(parsedDeadline.getDate() + days)
        } else if (weeksMatch && weeksMatch[1]) {
          const weeks = parseInt(weeksMatch[1])
          parsedDeadline = new Date()
          parsedDeadline.setDate(parsedDeadline.getDate() + weeks * 7)
        } else {
          // Try parsing ISO date
          parsedDeadline = new Date(deadline)
          if (isNaN(parsedDeadline.getTime())) {
            parsedDeadline = undefined
          }
        }
      } catch (error) {
        console.error(
          '[create_project_with_smart_labels] Failed to parse deadline:',
          error,
        )
        parsedDeadline = undefined
      }
    }

    // Step 4: Create the project
    console.log('[create_project_with_smart_labels] Creating project...')
    try {
      const projectData: any = {
        name: formattedName,
        description: formattedDescription,
        enableAiAssistance,
        creatorId: context.userId,
      }

      // Add optional fields only if they exist
      if (categoryId) projectData.categoryId = categoryId
      if (parsedDeadline) projectData.deadline = parsedDeadline

      const project = await ProjectService.create(projectData)

      console.log(
        `[create_project_with_smart_labels] Project created: ${project.id}`,
      )

      // Step 5: Assign labels to project
      console.log(
        `[create_project_with_smart_labels] Assigning ${labelIds.length} labels...`,
      )
      const assignmentResult = await ProjectLabelService.assignLabels(
        project.id,
        labelIds,
      )

      console.log(
        `[create_project_with_smart_labels] Assigned ${assignmentResult.count} labels`,
      )

      // Step 6: Get full project details with labels
      const fullProject = await prisma.project.findUnique({
        where: { id: project.id },
        include: {
          category: true,
          projectLabels: {
            include: {
              label: {
                include: { category: true },
              },
            },
          },
          _count: {
            select: { members: true, tasks: true },
          },
        },
      })

      // Step 7: Format success response
      const assignedLabelNames = fullProject!.projectLabels
        .map((pl) => pl.label.name)
        .join(', ')

      return ResponseFormatter.asCard({
        title: '✅ Project Created Successfully!',
        variant: 'success',
        fields: {
          'Project Name': fullProject!.name,
          Description: fullProject!.description || '(No description)',
          Category: fullProject!.category?.name || 'Uncategorized',
          Deadline: fullProject!.deadline
            ? new Date(fullProject!.deadline).toLocaleDateString('vi-VN')
            : 'No deadline',
          'Labels Assigned': `${fullProject!.projectLabels.length} labels`,
          'Label Names': assignedLabelNames,
          'AI Assistance': enableAiAssistance ? '✓ Enabled' : '✗ Disabled',
          Members: `${fullProject!._count.members} member(s) (including you as MANAGER)`,
          'Project ID': fullProject!.id,
        },
        actions: [
          {
            label: '👀 View project details',
            action: 'view_project',
            variant: 'primary',
            data: { projectId: fullProject!.id },
          },
          {
            label: '➕ Create another project',
            action: 'suggest_labels_for_project',
            variant: 'secondary',
          },
          {
            label: '👥 Invite members',
            action: 'invite_members',
            variant: 'secondary',
            data: { projectId: fullProject!.id },
          },
        ],
      })
    } catch (error: any) {
      console.error('[create_project_with_smart_labels] Error:', error)
      throw new Error(`Failed to create project: ${error.message}`)
    }
  },
  {
    description: `Create a new project with AI-formatted name/description and assign suggested labels.

This function:
1. Uses AI to format raw project idea into professional name and description
2. Optionally asks for additional info (category, deadline)
3. Creates the project
4. Assigns selected labels to the project
5. Adds creator as MANAGER automatically

Use cases:
- After user confirms labels from suggest_labels_for_project
- Direct project creation with label IDs
- Auto-formats messy input into professional project details

Workflow:
1. User confirms suggested labels
2. AI formats name + description
3. Ask for category/deadline (optional)
4. Create project + assign labels
5. Return success with actions

IMPORTANT: labelIds must be valid label IDs from the database.`,
    parameters: {
      type: 'object',
      properties: {
        projectIdea: {
          type: 'string',
          description:
            'Raw project idea from user (e.g., "tạo project detect traffic"). Will be formatted by AI.',
        },
        projectDescription: {
          type: 'string',
          description:
            'Alternative: Pre-formatted description from suggest_labels_for_project flow',
        },
        labelIds: {
          type: 'array',
          items: { type: 'string' },
          description:
            'Array of label IDs to assign to project. Get from suggest_labels_for_project.',
        },
        categoryId: {
          type: 'string',
          description: 'Optional: Project category UUID',
        },
        deadline: {
          type: 'string',
          description:
            'Optional: Deadline as string. Can be relative ("30 ngày", "2 tuần") or ISO date.',
        },
        enableAiAssistance: {
          type: 'boolean',
          description:
            'Enable AI assistance for this project (default: true)',
        },
        _skipQuestions: {
          type: 'boolean',
          description: 'Internal: Skip asking for missing info',
        },
      },
      required: ['labelIds'],
    },
  },
)
