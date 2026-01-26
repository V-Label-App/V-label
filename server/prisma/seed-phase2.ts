/**
 * Phase 2 Seed Data
 *
 * Creates comprehensive test data for V-Label Phase 2 features:
 * - Enhanced ML Export workflow
 * - Auto-assignment system
 * - Workload management
 * - Image metadata with dimensions
 * - Annotation consensus
 *
 * Usage:
 *   npx ts-node prisma/seed-phase2.ts
 */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// Helper function to hash passwords
async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10);
}

async function main() {
  console.log('🌱 Starting Phase 2 seed...\n');

  // ===========================================================================
  // 1. USERS
  // ===========================================================================
  console.log('👤 Creating users...');

  const adminPassword = await hashPassword('admin123');
  const managerPassword = await hashPassword('manager123');
  const userPassword = await hashPassword('user123');

  const admin = await prisma.user.upsert({
    where: { email: 'admin@vlabel.com' },
    update: {},
    create: {
      email: 'admin@vlabel.com',
      passwordHash: adminPassword,
      fullName: 'System Administrator',
      role: 'ADMIN',
      isActive: true,
      reputationScore: 100,
      totalTasksDone: 0,
    },
  });

  const manager = await prisma.user.upsert({
    where: { email: 'manager@vlabel.com' },
    update: {},
    create: {
      email: 'manager@vlabel.com',
      passwordHash: managerPassword,
      fullName: 'Project Manager',
      role: 'MANAGER',
      isActive: true,
      reputationScore: 100,
      totalTasksDone: 0,
    },
  });

  const reviewer1 = await prisma.user.upsert({
    where: { email: 'reviewer1@vlabel.com' },
    update: {},
    create: {
      email: 'reviewer1@vlabel.com',
      passwordHash: userPassword,
      fullName: 'Alice Reviewer',
      role: 'REVIEWER',
      isActive: true,
      reputationScore: 95,
      totalTasksDone: 250,
    },
  });

  const reviewer2 = await prisma.user.upsert({
    where: { email: 'reviewer2@vlabel.com' },
    update: {},
    create: {
      email: 'reviewer2@vlabel.com',
      passwordHash: userPassword,
      fullName: 'Bob Reviewer',
      role: 'REVIEWER',
      isActive: true,
      reputationScore: 88,
      totalTasksDone: 180,
    },
  });

  const annotator1 = await prisma.user.upsert({
    where: { email: 'annotator1@vlabel.com' },
    update: {},
    create: {
      email: 'annotator1@vlabel.com',
      passwordHash: userPassword,
      fullName: 'Charlie Annotator',
      role: 'ANNOTATOR',
      isActive: true,
      reputationScore: 82,
      totalTasksDone: 120,
    },
  });

  const annotator2 = await prisma.user.upsert({
    where: { email: 'annotator2@vlabel.com' },
    update: {},
    create: {
      email: 'annotator2@vlabel.com',
      passwordHash: userPassword,
      fullName: 'Diana Annotator',
      role: 'ANNOTATOR',
      isActive: true,
      reputationScore: 75,
      totalTasksDone: 95,
    },
  });

  const annotator3 = await prisma.user.upsert({
    where: { email: 'annotator3@vlabel.com' },
    update: {},
    create: {
      email: 'annotator3@vlabel.com',
      passwordHash: userPassword,
      fullName: 'Eve Annotator',
      role: 'ANNOTATOR',
      isActive: true,
      reputationScore: 68,
      totalTasksDone: 45,
    },
  });

  console.log(`✅ Created ${[admin, manager, reviewer1, reviewer2, annotator1, annotator2, annotator3].length} users\n`);

  // ===========================================================================
  // 2. PROJECT with ENHANCED FEATURES
  // ===========================================================================
  console.log('📁 Creating project...');

  const project = await prisma.project.create({
    data: {
      name: 'Street Scene Object Detection',
      description: 'Annotate objects in street scenes for autonomous driving ML model',
      labelConfig: [
        { id: 'person', name: 'Person', color: '#FF6B6B', type: 'bbox', hotkey: '1' },
        { id: 'car', name: 'Car', color: '#4ECDC4', type: 'bbox', hotkey: '2' },
        { id: 'bicycle', name: 'Bicycle', color: '#45B7D1', type: 'bbox', hotkey: '3' },
        { id: 'traffic_light', name: 'Traffic Light', color: '#FFA07A', type: 'bbox', hotkey: '4' },
      ],
      deadline: new Date('2026-03-01'),
      enableAiAssistance: true,
      status: 'ACTIVE',
    },
  });

  console.log(`✅ Created project: ${project.name}\n`);

  // ===========================================================================
  // 3. PROJECT MEMBERS with PROJECT ROLES
  // ===========================================================================
  console.log('👥 Adding project members...');

  await prisma.projectMember.createMany({
    data: [
      { projectId: project.id, userId: manager.id, projectRole: 'PROJECT_MANAGER' },
      { projectId: project.id, userId: reviewer1.id, projectRole: 'REVIEWER' },
      { projectId: project.id, userId: reviewer2.id, projectRole: 'REVIEWER' },
      { projectId: project.id, userId: annotator1.id, projectRole: 'ANNOTATOR' },
      { projectId: project.id, userId: annotator2.id, projectRole: 'ANNOTATOR' },
      { projectId: project.id, userId: annotator3.id, projectRole: 'ANNOTATOR' },
    ],
    skipDuplicates: true,
  });

  console.log(`✅ Added 6 project members\n`);

  // ===========================================================================
  // 4. ASSIGNMENT RULES (Auto-assignment configuration)
  // ===========================================================================
  console.log('⚙️  Creating assignment rules...');

  const assignmentRule = await prisma.assignmentRule.create({
    data: {
      projectId: project.id,
      isAutoAssignEnabled: true,
      assignmentStrategy: 'LEAST_BUSY',
      autoAssignReviewer: true,
      reviewerDelayHours: 0,
      maxTasksPerAnnotator: 10,
      maxTasksPerReviewer: 20,
      minAnnotatorReputation: 50,
      minReviewerReputation: 70,
      maxRejectionsBeforeReassign: 3,
      autoReassignOnSkip: true,
    },
  });

  console.log(`✅ Created assignment rule: ${assignmentRule.assignmentStrategy}\n`);

  // ===========================================================================
  // 5. USER WORKLOAD (Initialize workload tracking)
  // ===========================================================================
  console.log('📊 Initializing user workload...');

  await prisma.userWorkload.createMany({
    data: [
      {
        userId: annotator1.id,
        projectId: project.id,
        assignedTasks: 0,
        inProgressTasks: 0,
        maxConcurrentTasks: 10,
        availabilityStatus: 'AVAILABLE',
      },
      {
        userId: annotator2.id,
        projectId: project.id,
        assignedTasks: 0,
        inProgressTasks: 0,
        maxConcurrentTasks: 10,
        availabilityStatus: 'AVAILABLE',
      },
      {
        userId: annotator3.id,
        projectId: project.id,
        assignedTasks: 0,
        inProgressTasks: 0,
        maxConcurrentTasks: 8,
        availabilityStatus: 'AVAILABLE',
      },
      {
        userId: reviewer1.id,
        projectId: project.id,
        assignedTasks: 0,
        pendingReviewTasks: 0,
        maxConcurrentTasks: 20,
        availabilityStatus: 'AVAILABLE',
      },
      {
        userId: reviewer2.id,
        projectId: project.id,
        assignedTasks: 0,
        pendingReviewTasks: 0,
        maxConcurrentTasks: 20,
        availabilityStatus: 'AVAILABLE',
      },
    ],
    skipDuplicates: true,
  });

  console.log(`✅ Initialized workload for 5 users\n`);

  // ===========================================================================
  // 6. AI MODEL
  // ===========================================================================
  console.log('🤖 Creating AI model...');

  const aiModel = await prisma.aiModel.create({
    data: {
      name: 'YOLOv8',
      version: 'v8.0.0',
      modelType: 'object_detection',
      config: {
        confidence_threshold: 0.5,
        nms_threshold: 0.4,
        input_size: [640, 640],
        classes: ['person', 'car', 'bicycle', 'traffic_light'],
      },
      metrics: {
        mAP: 0.85,
        precision: 0.90,
        recall: 0.82,
        f1_score: 0.86,
      },
      isActive: true,
      endpointUrl: 'http://ai-service:8000/detect',
    },
  });

  console.log(`✅ Created AI model: ${aiModel.name} ${aiModel.version}\n`);

  // ===========================================================================
  // 7. DATASET
  // ===========================================================================
  console.log('🗂️  Creating dataset...');

  const dataset = await prisma.dataset.create({
    data: {
      projectId: project.id,
      name: 'Downtown Street Scenes - January 2026',
      description: 'Collection of street scenes from downtown area during rush hour',
      source: 'dash_camera_footage',
      sourceMetadata: {
        camera_model: 'GoPro Hero 11',
        location: 'Downtown District',
        weather: 'Clear',
        time_of_day: 'Morning (8AM-10AM)',
      },
      totalImages: 20,
      processedImages: 20,
      uploadedBy: manager.id,
    },
  });

  console.log(`✅ Created dataset: ${dataset.name}\n`);

  // ===========================================================================
  // 8. IMAGES (with real dimensions for ML export)
  // ===========================================================================
  console.log('🖼️  Creating images with metadata...');

  const imageData = [
    { filename: 'street_001.jpg', width: 1920, height: 1080, size: 524288 },
    { filename: 'street_002.jpg', width: 1920, height: 1080, size: 487362 },
    { filename: 'street_003.jpg', width: 1920, height: 1080, size: 512384 },
    { filename: 'street_004.jpg', width: 1920, height: 1080, size: 498576 },
    { filename: 'street_005.jpg', width: 1920, height: 1080, size: 501293 },
    { filename: 'street_006.jpg', width: 3840, height: 2160, size: 1048576 }, // 4K
    { filename: 'street_007.jpg', width: 3840, height: 2160, size: 1024000 },
    { filename: 'street_008.jpg', width: 1280, height: 720, size: 245760 }, // HD
    { filename: 'street_009.jpg', width: 1280, height: 720, size: 256000 },
    { filename: 'street_010.jpg', width: 1920, height: 1080, size: 515072 },
  ];

  const images = [];
  for (const imgData of imageData) {
    const image = await prisma.image.create({
      data: {
        projectId: project.id,
        datasetId: dataset.id,
        originalFilename: imgData.filename,
        storageUrl: `https://storage.vlabel.com/projects/${project.id}/images/${imgData.filename}`,
        storagePath: `/projects/${project.id}/images/${imgData.filename}`,
        width: imgData.width,
        height: imgData.height,
        channels: 3,
        fileSizeBytes: imgData.size,
        format: 'jpg',
        checksum: `sha256_${Math.random().toString(36).substring(7)}`,
        uploadedBy: manager.id,
      },
    });
    images.push(image);
  }

  console.log(`✅ Created ${images.length} images with dimensions\n`);

  // ===========================================================================
  // 9. TASKS (with priority, deadline, difficulty)
  // ===========================================================================
  console.log('📝 Creating tasks...');

  const tasks = [];
  for (let i = 0; i < images.length; i++) {
    const image = images[i];
    const task = await prisma.task.create({
      data: {
        projectId: project.id,
        imageId: image.id,
        status: i < 3 ? 'DONE' : i < 7 ? 'IN_PROGRESS' : 'TODO',
        priority: i < 2 ? 'HIGH' : i < 5 ? 'MEDIUM' : 'LOW',
        deadline: new Date(Date.now() + (10 - i) * 24 * 60 * 60 * 1000), // Staggered deadlines
        difficultyLevel: i < 2 ? 'HARD' : i < 7 ? 'NORMAL' : 'EASY',
      },
    });
    tasks.push(task);
  }

  console.log(`✅ Created ${tasks.length} tasks\n`);

  // ===========================================================================
  // 10. TASK ASSIGNMENTS (with enhanced workflow fields)
  // ===========================================================================
  console.log('📋 Creating task assignments...');

  // Task 1: APPROVED (complete workflow)
  const assignment1 = await prisma.taskAssignment.create({
    data: {
      taskId: tasks[0].id,
      annotatorId: annotator1.id,
      reviewerId: reviewer1.id,
      status: 'APPROVED',
      annotations: {
        annotations: [
          {
            id: 'anno_1',
            labelId: 'person',
            labelName: 'Person',
            type: 'bbox',
            bbox_pixel: { x: 100, y: 150, width: 200, height: 300 },
            bbox_normalized: {
              x_center: 0.1041,
              y_center: 0.2777,
              width: 0.1041,
              height: 0.2777,
            },
          },
          {
            id: 'anno_2',
            labelId: 'car',
            labelName: 'Car',
            type: 'bbox',
            bbox_pixel: { x: 800, y: 400, width: 400, height: 250 },
            bbox_normalized: {
              x_center: 0.5208,
              y_center: 0.4861,
              width: 0.2083,
              height: 0.2314,
            },
          },
        ],
        metadata: {
          annotator_time_seconds: 180,
          tool_version: 'v1.2.3',
        },
      },
      isAiGenerated: false,
      reviewScore: 9,
      reviewComment: 'Excellent work! Precise bounding boxes.',
      rejectionCount: 0,
      estimatedTimeMinutes: 5,
      actualTimeSeconds: 180,
      assignedBy: manager.id,
      assignmentMethod: 'AUTO_LEAST_BUSY',
    },
  });

  // Task 2: APPROVED with AI assistance
  const assignment2 = await prisma.taskAssignment.create({
    data: {
      taskId: tasks[1].id,
      annotatorId: annotator2.id,
      reviewerId: reviewer1.id,
      status: 'APPROVED',
      annotations: {
        annotations: [
          {
            id: 'anno_3',
            labelId: 'bicycle',
            labelName: 'Bicycle',
            type: 'bbox',
            bbox_pixel: { x: 300, y: 500, width: 150, height: 200 },
            bbox_normalized: {
              x_center: 0.1953,
              y_center: 0.5555,
              width: 0.0781,
              height: 0.1851,
            },
            is_ai_suggested: true,
            confidence: 0.89,
          },
        ],
        metadata: {
          annotator_time_seconds: 120,
          ai_suggestions_used: 1,
        },
      },
      isAiGenerated: true,
      aiModelId: aiModel.id,
      aiConfidence: 0.89,
      reviewScore: 8,
      reviewComment: 'Good work. AI suggestion was accurate.',
      rejectionCount: 0,
      estimatedTimeMinutes: 3,
      actualTimeSeconds: 120,
      assignedBy: manager.id,
      assignmentMethod: 'AUTO_LEAST_BUSY',
    },
  });

  // Task 3: REJECTED once, then approved (rework scenario)
  const assignment3 = await prisma.taskAssignment.create({
    data: {
      taskId: tasks[2].id,
      annotatorId: annotator3.id,
      reviewerId: reviewer2.id,
      status: 'APPROVED',
      annotations: {
        annotations: [
          {
            id: 'anno_4',
            labelId: 'person',
            labelName: 'Person',
            type: 'bbox',
            bbox_pixel: { x: 600, y: 300, width: 180, height: 280 },
            bbox_normalized: {
              x_center: 0.3593,
              y_center: 0.3935,
              width: 0.09375,
              height: 0.2592,
            },
          },
        ],
        metadata: {
          annotator_time_seconds: 240,
          rework_count: 1,
        },
      },
      isAiGenerated: false,
      reviewScore: 7,
      reviewComment: 'Better after revision. Make sure boxes are tight.',
      rejectionCount: 1,
      estimatedTimeMinutes: 5,
      actualTimeSeconds: 240,
      assignedBy: manager.id,
      assignmentMethod: 'MANUAL',
    },
  });

  // Tasks 4-7: IN_PROGRESS (various states)
  await prisma.taskAssignment.createMany({
    data: [
      {
        taskId: tasks[3].id,
        annotatorId: annotator1.id,
        reviewerId: reviewer1.id,
        status: 'IN_PROGRESS',
        estimatedTimeMinutes: 5,
        assignedBy: manager.id,
        assignmentMethod: 'AUTO_ROUND_ROBIN',
      },
      {
        taskId: tasks[4].id,
        annotatorId: annotator2.id,
        reviewerId: reviewer2.id,
        status: 'SUBMITTED',
        annotations: {
          annotations: [
            {
              id: 'anno_5',
              labelId: 'car',
              labelName: 'Car',
              type: 'bbox',
              bbox_pixel: { x: 1200, y: 600, width: 350, height: 220 },
              bbox_normalized: {
                x_center: 0.6901,
                y_center: 0.6666,
                width: 0.1822,
                height: 0.2037,
              },
            },
          ],
        },
        estimatedTimeMinutes: 4,
        actualTimeSeconds: 195,
        assignedBy: manager.id,
        assignmentMethod: 'AUTO_LEAST_BUSY',
      },
      {
        taskId: tasks[5].id,
        annotatorId: annotator3.id,
        status: 'ASSIGNED',
        estimatedTimeMinutes: 6,
        assignedBy: manager.id,
        assignmentMethod: 'AUTO_SKILL_BASED',
      },
      {
        taskId: tasks[6].id,
        annotatorId: annotator1.id,
        status: 'SKIPPED',
        skipReason: 'Image too blurry, cannot identify objects clearly',
        assignedBy: manager.id,
        assignmentMethod: 'AUTO_ROUND_ROBIN',
      },
    ],
  });

  console.log(`✅ Created ${3 + 4} task assignments\n`);

  // ===========================================================================
  // 11. ANNOTATION CONSENSUS (Final annotations for export)
  // ===========================================================================
  console.log('🎯 Creating annotation consensus...');

  await prisma.annotationConsensus.createMany({
    data: [
      {
        taskId: tasks[0].id,
        finalAnnotations: assignment1.annotations,
        consensusMethod: 'single_annotator',
        sourceAssignmentIds: [assignment1.id],
        agreementScore: 1.0,
        isVerified: true,
        verifiedBy: reviewer1.id,
        verifiedAt: new Date(),
      },
      {
        taskId: tasks[1].id,
        finalAnnotations: assignment2.annotations,
        consensusMethod: 'single_annotator',
        sourceAssignmentIds: [assignment2.id],
        agreementScore: 1.0,
        isVerified: true,
        verifiedBy: reviewer1.id,
        verifiedAt: new Date(),
      },
      {
        taskId: tasks[2].id,
        finalAnnotations: assignment3.annotations,
        consensusMethod: 'expert_review',
        sourceAssignmentIds: [assignment3.id],
        agreementScore: 0.95,
        isVerified: true,
        verifiedBy: reviewer2.id,
        verifiedAt: new Date(),
      },
    ],
  });

  console.log(`✅ Created 3 annotation consensus records\n`);

  // ===========================================================================
  // 12. EXPORT (ML Dataset Export)
  // ===========================================================================
  console.log('📦 Creating export record...');

  const exportRecord = await prisma.export.create({
    data: {
      projectId: project.id,
      format: 'yolo',
      version: 1,
      splitType: 'train_val',
      splitRatio: {
        train: 0.8,
        val: 0.2,
      },
      filterCriteria: {
        status: 'APPROVED',
        is_verified: true,
        min_review_score: 7,
      },
      totalImages: 3,
      totalAnnotations: 4,
      classDistribution: {
        person: 2,
        car: 1,
        bicycle: 1,
      },
      fileUrl: `https://storage.vlabel.com/exports/${project.id}/yolo_export_v1.zip`,
      fileSizeBytes: 1024000,
      checksum: 'sha256_export123',
      exportedBy: manager.id,
      downloadCount: 0,
      labelConfigSnapshot: project.labelConfig,
    },
  });

  console.log(`✅ Created export: ${exportRecord.format} (${exportRecord.totalImages} images)\n`);

  // ===========================================================================
  // 13. TASK REASSIGNMENT (Reassignment history)
  // ===========================================================================
  console.log('🔄 Creating task reassignment...');

  await prisma.taskReassignment.create({
    data: {
      taskId: tasks[6].id,
      oldAnnotatorId: annotator1.id,
      newAnnotatorId: annotator2.id,
      reason: 'USER_SKIPPED',
      reassignedBy: manager.id,
      notes: 'Image quality issue - reassigning to another annotator',
    },
  });

  console.log(`✅ Created task reassignment record\n`);

  // ===========================================================================
  // SUMMARY
  // ===========================================================================
  console.log('\n🎉 Phase 2 Seed Complete!\n');
  console.log('📊 Summary:');
  console.log(`   - Users: 7 (1 admin, 1 manager, 2 reviewers, 3 annotators)`);
  console.log(`   - Project: "${project.name}"`);
  console.log(`   - Datasets: 1 (${dataset.totalImages} images)`);
  console.log(`   - Images: ${images.length} (with real dimensions for ML export)`);
  console.log(`   - Tasks: ${tasks.length} (3 done, 4 in-progress, 3 todo)`);
  console.log(`   - Task Assignments: 7 (3 approved, 1 submitted, 1 in-progress, 1 assigned, 1 skipped)`);
  console.log(`   - Annotation Consensus: 3 (ready for export)`);
  console.log(`   - AI Model: ${aiModel.name} ${aiModel.version}`);
  console.log(`   - Assignment Rule: ${assignmentRule.assignmentStrategy}`);
  console.log(`   - Exports: 1 (YOLO format)`);
  console.log(`   - User Workload: 5 users tracked\n`);

  console.log('🔐 Login credentials:');
  console.log(`   Admin:      admin@vlabel.com / admin123`);
  console.log(`   Manager:    manager@vlabel.com / manager123`);
  console.log(`   Reviewer1:  reviewer1@vlabel.com / user123`);
  console.log(`   Annotator1: annotator1@vlabel.com / user123\n`);

  console.log('✅ You can now test:');
  console.log(`   - ML Export: POST /api/projects/${project.id}/export`);
  console.log(`   - Auto-assignment: POST /api/tasks/auto-assign`);
  console.log(`   - Workload dashboard: GET /api/projects/${project.id}/workload`);
  console.log(`   - Consensus tracking: GET /api/tasks/${tasks[0].id}/consensus\n`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Seed failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
