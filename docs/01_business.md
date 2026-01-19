# Business Workflow Documentation

> Complete guide to V-Label's business processes, workflows, and operational procedures

**Last Updated:** 2026-01-19  
**Version:** 1.0  
**Status:** Production Ready

---

## Table of Contents

1. [Business Overview](#business-overview)
2. [User Roles & Responsibilities](#user-roles--responsibilities)
3. [Complete Workflow](#complete-workflow)
4. [Task Assignment Strategy](#task-assignment-strategy)
5. [Consensus Labeling](#consensus-labeling)
6. [Review Process](#review-process)
7. [AI Assistance](#ai-assistance)
8. [Project Progress Tracking](#project-progress-tracking)
9. [Notification System](#notification-system)
10. [Data Export](#data-export)
11. [Edge Cases & Special Scenarios](#edge-cases--special-scenarios)
12. [Quality Management](#quality-management)

---

## Business Overview

### Purpose

V-Label is a **collaborative image annotation platform** designed to produce **high-quality labeled datasets** for machine learning projects through a structured workflow involving:

- **Managers** who organize projects and coordinate teams
- **Annotators** who perform actual image labeling
- **Reviewers** who ensure annotation quality
- **Consensus mechanism** to validate annotation accuracy

### Core Value Proposition

1. ✅ **Quality Assurance** - Multiple annotators + reviewer approval ensures high accuracy
2. ✅ **Team Collaboration** - Structured roles and clear responsibilities
3. ✅ **Progress Tracking** - Real-time visibility into project completion
4. ✅ **AI Augmentation** - Optional AI assistance to accelerate annotation
5. ✅ **Standardized Export** - ML-ready data formats (YOLO, etc.)

---

## User Roles & Responsibilities

### 1. Manager (Project Owner)

**Primary Responsibilities:**
- Create and configure annotation projects
- Define label sets (allowed object classes)
- Recruit team members (annotators and reviewers)
- Assign tasks (manual or automatic)
- Monitor project progress
- Export final datasets

**Key Permissions:**
- ✅ Create/edit/delete projects
- ✅ Add/remove team members
- ✅ Assign/reassign tasks
- ✅ Configure AI assistance
- ✅ Delete/modify tasks at any time (even after assignment)
- ✅ Export annotated data

**Cannot:**
- ❌ Perform annotations (must be annotator role)
- ❌ Review tasks directly (must be reviewer role)

---

### 2. Annotator (Worker)

**Primary Responsibilities:**
- Receive assigned image annotation tasks
- Draw accurate annotations (bounding boxes, polygons, etc.)
- Submit completed work for review
- Rework rejected tasks based on feedback

**Key Permissions:**
- ✅ View assigned tasks only
- ✅ Create/edit annotations
- ✅ Submit tasks for review
- ✅ Edit annotations BEFORE reviewer starts review
- ✅ View review feedback when rejected

**Cannot:**
- ❌ See other annotators' work
- ❌ Approve own work
- ❌ Access project settings

---

### 3. Reviewer (Quality Controller)

**Primary Responsibilities:**
- Review submitted annotations
- Provide quality scores and feedback
- Approve high-quality work
- Reject poor work with detailed reasons
- Optionally re-annotate (instead of rejecting)

**Key Permissions:**
- ✅ View all submitted annotations
- ✅ Approve/reject tasks
- ✅ Provide written feedback
- ✅ Re-annotate images directly (alternative to rejection)
- ✅ View annotation history

**Cannot:**
- ❌ Modify project settings
- ❌ Assign tasks to annotators
- ❌ Export data

---

### 4. Admin (System Administrator)

**Primary Responsibilities:**
- Manage all users and permissions
- Configure system settings
- Monitor platform health
- Handle escalations

**Key Permissions:**
- ✅ Full access to all features
- ✅ User management (create, disable, delete)
- ✅ System configuration
- ✅ Audit log access

---

## Complete Workflow

### High-Level Process Flow

```
┌──────────────────────────────────────────────────────────────┐
│  PHASE 1: PROJECT SETUP (Manager)                           │
└──────────────────────────────────────────────────────────────┘

Manager creates project
  ├─ Define project name, description, deadline
  ├─ Configure label set (e.g., [car, person, bicycle])
  ├─ Enable/Disable AI assistance
  └─ Add team members:
      ├─ Add Annotators (workers)
      └─ Add Reviewers (quality controllers)

┌──────────────────────────────────────────────────────────────┐
│  PHASE 2: TASK CREATION & ASSIGNMENT                        │
└──────────────────────────────────────────────────────────────┘

Manager uploads images
  ↓
System creates tasks (1 task = 1 image)
  ↓
Manager assigns tasks:
  ├─ OPTION A: Manual assignment (drag-drop to specific annotators)
  └─ OPTION B: Automatic assignment (algorithm TBD - round-robin, skill-based, etc.)
  ↓
CONSENSUS REQUIREMENT: Each image assigned to ≥ 2 annotators
  (Example: image_001.jpg → [Annotator A, Annotator B, Annotator C])

┌──────────────────────────────────────────────────────────────┐
│  PHASE 3: ANNOTATION (Annotator)                            │
└──────────────────────────────────────────────────────────────┘

Annotator receives task notification
  ↓
Opens annotation canvas
  ↓
IF AI Assistance enabled:
  ├─ System scans image with AI model
  ├─ Pre-fills suggested bounding boxes/labels
  └─ Annotator reviews and corrects AI suggestions
ELSE:
  └─ Annotator manually draws all annotations
  ↓
Annotator can EDIT before submitting
  ↓
Annotator SUBMITS task
  ↓
Status: ASSIGNED → IN_PROGRESS → SUBMITTED

┌──────────────────────────────────────────────────────────────┐
│  PHASE 4: REVIEW (Reviewer)                                 │
└──────────────────────────────────────────────────────────────┘

Reviewer receives notification
  ↓
Opens submitted task
  ↓
Inspects annotations:
  ├─ Checks label accuracy
  ├─ Verifies bounding box precision
  └─ Assesses overall quality
  ↓
DECISION:
  ├─ APPROVE ────────────────┐
  │   ├─ Annotator gets +reputation (future)
  │   ├─ Project progress increases
  │   └─ Status: SUBMITTED → APPROVED
  │
  ├─ REJECT ─────────────────┐
  │   ├─ Provide detailed feedback (required)
  │   ├─ Task returns to annotator
  │   ├─ Status: SUBMITTED → REJECTED → IN_PROGRESS (rework)
  │   ├─ Reject count increments
  │   └─ IF reject_count > MAX_REJECTS → Task SKIPPED
  │
  └─ RE-ANNOTATE (Alternative)
      ├─ Reviewer fixes annotations directly
      ├─ No rejection, no annotator penalty
      └─ Status: SUBMITTED → APPROVED (by reviewer)

┌──────────────────────────────────────────────────────────────┐
│  PHASE 5: CONSENSUS CHECK (System)                          │
└──────────────────────────────────────────────────────────────┘

After all annotators complete same image:
  ↓
System compares annotations:
  ├─ Calculate Inter-Annotator Agreement (IoU, F1, etc.)
  ├─ IF agreement >= threshold:
  │   └─ Annotations considered reliable
  └─ IF agreement < threshold:
      └─ Flag for manual review or third annotator

┌──────────────────────────────────────────────────────────────┐
│  PHASE 6: PROJECT COMPLETION & EXPORT                       │
└──────────────────────────────────────────────────────────────┘

Project reaches 100% (all tasks APPROVED or SKIPPED)
  ↓
Manager reviews final statistics
  ↓
Manager triggers manual export:
  ├─ Select tasks to export (APPROVED only, or include SKIPPED)
  ├─ Choose format: YOLO (v5, v8), COCO JSON (future), Pascal VOC (future)
  └─ Download zip file with images + annotations
  ↓
Project archived
```

---

## Task Assignment Strategy

### Consensus Labeling Model

**Requirement:** Each image MUST be assigned to **minimum 2 annotators**

**Rationale:**
- Detect annotator errors and biases
- Calculate inter-annotator agreement
- Improve overall dataset quality
- Identify difficult/ambiguous images

### Assignment Methods

#### Method 1: Manual Assignment (Manager-Controlled)

```
Manager selects image(s)
  ↓
Drag-and-drop to specific annotators
  ↓
System validates: minimum 2 annotators selected
  ↓
Tasks created
```

**Use Cases:**
- Small teams where manager knows annotator strengths
- Assigning expert annotators to difficult images
- Balancing workload manually

---

#### Method 2: Automatic Assignment (Algorithm-Based)

**Phase 1 (Current):** Simple Round-Robin

```
Images: [img1, img2, img3, img4]
Annotators: [Ann A, Ann B, Ann C]
Assignments per image: 2

Round-robin distribution:
  img1 → [Ann A, Ann B]
  img2 → [Ann B, Ann C]
  img3 → [Ann C, Ann A]
  img4 → [Ann A, Ann B]
```

**Phase 2 (Future - TBD):** Advanced Algorithms

Possible strategies:
- **Skill-based**: Assign based on annotator reputation score
- **Availability-based**: Prioritize annotators with fewer pending tasks
- **Specialization-based**: Match annotators to specific object types
- **Conflict-resolution**: Assign third annotator when first two disagree

---

## Consensus Labeling

### How It Works

```
Example: image_car.jpg assigned to 3 annotators

Annotator A submits:
  - bbox(car): x=100, y=200, w=300, h=150
  - bbox(person): x=500, y=100, w=80, h=200

Annotator B submits:
  - bbox(car): x=105, y=198, w=295, h=155  (similar to A)
  - bbox(person): x=510, y=95, w=75, h=210  (similar to A)

Annotator C submits:
  - bbox(car): x=100, y=200, w=300, h=150  (exact match)
  - bbox(bicycle): x=300, y=300, w=100, h=120  (MISS - didn't see person)

System Analysis:
  ├─ Car detection: HIGH agreement (3/3 annotators)
  ├─ Person detection: MEDIUM agreement (2/3 annotators)
  └─ Bicycle detection: LOW agreement (1/3 annotators - possible error)

Reviewer Action:
  └─ Manually verify ambiguous objects (bicycle, person location)
```

### Consensus Metrics (Future)

- **IoU (Intersection over Union)**: Measure bbox overlap between annotators
- **Label Agreement**: % of annotators who chose same class
- **Detection Rate**: % of annotators who found same object

---

## Review Process

### Reviewer Assignment

**Model:** Manager manually assigns reviewers to tasks

**Assignment Options:**

1. **Project-Level Assignment**
   - Manager assigns reviewers when creating project
   - All submitted tasks auto-route to assigned reviewers

2. **Task-Level Assignment**
   - Manager assigns specific reviewer to specific task after submission
   - Useful for specialized review (e.g., medical images)

3. **Multiple Reviewers per Task**
   - Same task can be reviewed by multiple reviewers
   - Each reviewer makes independent approve/reject decision
   - Final status: Requires majority approval (future implementation)

---

### Review Workflow States

```
Task Lifecycle with Review:

ASSIGNED (initial)
  ↓ Annotator works
IN_PROGRESS (annotating)
  ↓ Annotator submits
SUBMITTED (awaiting review)
  ↓ Reviewer decision
  ├─ APPROVED ──────────────→ DONE (final)
  │
  ├─ REJECTED ──────────────→ IN_PROGRESS (rework)
  │   ├─ Annotator receives feedback
  │   ├─ Annotator edits and resubmits
  │   ├─ reject_count++
  │   └─ IF reject_count > MAX_REJECTS → SKIPPED
  │
  └─ RE-ANNOTATED (reviewer fixes directly)
      └─ APPROVED (no annotator penalty)
```

---

### Rejection Workflow

**When Reviewer Rejects:**

1. **Reviewer provides mandatory feedback:**
   ```json
   {
     "reason": "Missing person annotations in background",
     "suggestions": "Please check areas behind the car",
     "review_score": 4
   }
   ```

2. **System actions:**
   - Status: SUBMITTED → REJECTED
   - Increment `reject_count` for this task assignment
   - Send notification to annotator with feedback
   - Task returns to annotator's queue

3. **Annotator actions:**
   - View feedback from reviewer
   - Re-open annotation canvas
   - Make corrections
   - Re-submit

4. **Rejection Limits:**
   ```
   IF reject_count >= 3:
     └─ Status → SKIPPED
     └─ Warning sent to annotator
     └─ Manager notified about problematic task
     └─ Task may be reassigned to different annotator
   ```

---

### Reviewer Re-Annotation Option

**Alternative to Rejection:** Reviewer can fix annotations directly

**Use Cases:**
- Minor errors (e.g., bbox slightly off)
- Faster than reject-rework cycle
- Training new annotators (they can see corrections)

**Process:**
```
Reviewer views task
  ↓
Clicks "Edit Annotations" instead of "Reject"
  ↓
Makes corrections on canvas
  ↓
Saves and approves
  ↓
Status: SUBMITTED → APPROVED
Original annotator sees final version (optional feature)
```

---

## AI Assistance

### Current Implementation

**Functionality:** AI scans image and detects objects

**Workflow:**

```
IF project.enableAiAssistance === true:
  
  1. Annotator opens task
     ↓
  2. System calls AI model (Google Gemini Vision API)
     ↓
  3. AI returns detected objects:
     {
       "objects": [
         { "label": "car", "bbox": [x, y, w, h], "confidence": 0.92 },
         { "label": "person", "bbox": [x, y, w, h], "confidence": 0.87 }
       ]
     }
     ↓
  4. System pre-fills annotation canvas with AI suggestions
     ↓
  5. Annotator reviews and corrects:
     - Accept accurate suggestions (click ✓)
     - Delete false positives (click ✗)
     - Add missed objects (draw manually)
     - Adjust bboxes for precision
     ↓
  6. Annotations marked with metadata:
     {
       "is_ai_generated": true,  // For this object
       "human_verified": true,   // After annotator review
       "ai_confidence": 0.92
     }
     ↓
  7. Annotator submits (same process as manual annotation)
```

**Key Points:**
- ✅ AI is **assistive only** - human always has final say
- ✅ All AI suggestions **require human verification**
- ✅ Reviewers can see which annotations were AI-generated
- ✅ AI reduces annotation time by ~40-60% (estimated)

---

### Future AI Enhancements (Planned)

1. **Active Learning**
   - AI learns from approved annotations
   - Improves suggestions over time

2. **Confidence Thresholds**
   - Auto-accept high-confidence predictions (>0.95)
   - Flag low-confidence for manual review

3. **Smart Pre-annotation**
   - Only use AI for specific object classes
   - Skip AI for complex/rare objects

---

## Project Progress Tracking

### Progress Calculation

**Formula:**

```typescript
const progress = {
  total_tasks: count(all tasks),
  submitted: count(tasks with status IN ['SUBMITTED', 'APPROVED']),
  approved: count(tasks with status = 'APPROVED'),
  
  // Primary metric
  completion_rate: (submitted + approved) / total_tasks * 100,
  
  // Quality metric
  approval_rate: approved / submitted * 100
};
```

**Example:**

```
Project: Street Scenes Dataset
├─ Total images: 1000
├─ Tasks created: 2000 (2 annotators per image)
│
├─ Status breakdown:
│   ├─ ASSIGNED: 500
│   ├─ IN_PROGRESS: 300
│   ├─ SUBMITTED: 400 (awaiting review)
│   ├─ APPROVED: 700
│   ├─ REJECTED: 50 (being reworked)
│   └─ SKIPPED: 50 (exceeded reject limit)
│
├─ Completion: (400 + 700) / 2000 = 55%
└─ Approval Rate: 700 / 1150 = 60.9%
```

---

### Project Completion Criteria

**Project considered COMPLETE when:**

```
(SUBMITTED + APPROVED) / TOTAL_TASKS >= 100%
```

**States:**
- `ACTIVE`: In progress (< 100%)
- `COMPLETED`: All tasks submitted/approved
- `ARCHIVED`: Manager closed project manually

---

## Notification System

### Manager Notifications

| Event | Trigger | Message Example |
|-------|---------|-----------------|
| **Project Created** | Manager clicks "Create Project" | "✅ Project 'Street Scenes' created successfully" |
| **Task Submitted** | Annotator submits task | "📝 John submitted task #123 for review" |
| **Project Completed** | Last task approved | "🎉 Project 'Street Scenes' is 100% complete!" |
| **Task Skipped** | Task rejected 3+ times | "⚠️ Task #456 skipped due to quality issues" |

---

### Annotator Notifications

| Event | Trigger | Message Example |
|-------|---------|-----------------|
| **Task Assigned** | Manager assigns task | "🎯 You have 5 new tasks assigned" |
| **Task Approved** | Reviewer approves | "✅ Your task #123 was approved (+2 reputation)" |
| **Task Rejected** | Reviewer rejects | "❌ Task #123 needs rework - see feedback" |
| **Deadline Warning** | 2 hours before deadline | "⏰ Task #123 due in 2 hours" |

---

### Reviewer Notifications

| Event | Trigger | Message Example |
|-------|---------|-----------------|
| **New Submission** | Annotator submits | "📥 New task #123 ready for review" |
| **Multiple Submissions** | Multiple annotators submit same image | "📥 3 versions of image_001.jpg need consensus review" |

---

### Notification Delivery Channels

1. **In-App** (Primary)
   - Real-time WebSocket notifications
   - Notification bell icon with counter
   - Notification inbox with history

2. **Email** (Optional)
   - Digest emails (daily summary)
   - Critical alerts (project deadlines)
   - Configurable per user

---

## Data Export

### Export Process

**Trigger:** Manager clicks "Export Project" button

**Steps:**

```
1. Manager selects export options:
   ├─ Include: APPROVED only | APPROVED + SUBMITTED | ALL
   ├─ Format: YOLO v5 | YOLO v8 | COCO JSON | Pascal VOC
   └─ Split: Train/Val/Test ratios (e.g., 70/20/10)

2. System generates export:
   ├─ Creates folder structure
   ├─ Converts annotations to selected format
   ├─ Copies images
   ├─ Generates metadata files (dataset.yaml, classes.txt, etc.)
   └─ Creates README with project info

3. System zips export:
   └─ project_name_YYYYMMDD_HHmmss.zip

4. Manager downloads zip file

5. (Optional) Export metadata logged:
   {
     "exported_by": "manager_id",
     "export_date": "2026-01-19T19:00:00Z",
     "format": "yolo_v8",
     "total_images": 1000,
     "total_annotations": 5234
   }
```

---

### Export Formats

#### YOLO Format (Primary)

**Directory Structure:**

```
project_export_yolo/
├── dataset.yaml         # Dataset configuration
├── classes.txt          # Label names (one per line)
│
├── images/
│   ├── train/          # 70% of images
│   ├── val/            # 20% of images
│   └── test/           # 10% of images
│
└── labels/
    ├── train/          # Corresponding .txt files
    ├── val/
    └── test/
```

**Annotation Format (.txt file):**

```
# image_001.txt
# Format: <class_id> <x_center> <y_center> <width> <height> (normalized 0-1)
0 0.5 0.3 0.2 0.4    # car
1 0.7 0.6 0.1 0.3    # person
```

**dataset.yaml:**

```yaml
path: ./project_export_yolo
train: images/train
val: images/val
test: images/test

nc: 3  # number of classes
names: ['car', 'person', 'bicycle']
```

---

#### Future Formats (Planned)

1. **COCO JSON**
   - Standard for object detection benchmarks
   - Single JSON file with all annotations

2. **Pascal VOC XML**
   - One XML file per image
   - Legacy format support

3. **CSV (Simple)**
   - Tabular format for analysis
   - Easy to import into Excel/Pandas

---

## Edge Cases & Special Scenarios

### 1. Deadline Warnings

**Behavior:**

```
Task deadline approaching:
  ├─ 24 hours before: Warning notification
  ├─ 2 hours before: Urgent notification
  └─ Past deadline: Task marked OVERDUE
      ├─ Still editable (no auto-skip)
      └─ Manager can reassign or extend deadline
```

---

### 2. Manager Task Modifications

**Manager can modify tasks AFTER assignment:**

```
Scenarios:
  ├─ Delete task:
  │   └─ Remove task from project (even if in progress)
  │   └─ Notify affected annotators/reviewers
  │
  ├─ Edit task details:
  │   ├─ Change image URL
  │   ├─ Update deadline
  │   └─ Add/remove instructions
  │
  └─ Reassign task:
      ├─ Remove current annotator
      ├─ Assign to different annotator
      └─ Reset status to ASSIGNED
```

**Use Cases:**
- Correct image upload mistakes
- Redistribute workload
- Handle annotator unavailability

---

### 3. Reviewer Re-Annotation

**Reviewer can fix annotations instead of rejecting:**

**Workflow:**

```
Reviewer views submitted task
  ↓
Identifies minor errors (e.g., bbox 5px off)
  ↓
OPTION A: Reject (slow)
  └─ Write feedback → Annotator reworks → Resubmit

OPTION B: Re-annotate (fast)
  └─ Edit directly → Save → Approve
  └─ Original annotator notified (optional)
  └─ No penalty to annotator
```

---

### 4. Annotator Pre-Review Edits

**Annotator can edit BEFORE reviewer starts:**

```
Annotator submits task
  ↓
Status: SUBMITTED (awaiting review)
  ↓
Annotator notices mistake
  ↓
IF reviewer has NOT started review:
  ├─ Click "Edit" button
  ├─ Status: SUBMITTED → IN_PROGRESS (temporary)
  ├─ Make corrections
  ├─ Re-submit
  └─ Status: IN_PROGRESS → SUBMITTED
ELSE:
  └─ Cannot edit (reviewer already working)
```

---

### 5. Task Reassignment After Multiple Rejections

**If task rejected 3+ times:**

```
reject_count >= MAX_REJECTS (3)
  ↓
Status → SKIPPED
  ↓
Manager notified:
  "⚠️ Task #123 skipped - quality issues with annotator"
  ↓
Manager options:
  ├─ Reassign to different annotator
  ├─ Mark as difficult (needs expert)
  └─ Delete task (if image quality is poor)
```

---

## Quality Management

### Quality Indicators

**Per Annotator:**
- Approval rate: `approved / (approved + rejected)`
- Average review score: `avg(review_scores)`
- Tasks completed: `count(approved tasks)`
- Rejection rate: `rejected / submitted`

**Per Project:**
- Overall progress: `(submitted + approved) / total`
- Quality rate: `approved / submitted`
- Average annotations per image
- Inter-annotator agreement (consensus metric)

---

### Low-Quality Annotator Handling

**Trigger:** `approval_rate < 50%` over last 20 tasks

**Actions:**

```
1. Warning notification:
   "⚠️ Your approval rate is 45% - review feedback to improve quality"

2. Manager notification:
   "⚠️ Annotator John has low approval rate (45%)"

3. Temporary measures (future):
   ├─ Limit new task assignments
   ├─ Require additional review
   └─ Provide training materials

4. Escalation (future):
   └─ Remove from project if quality doesn't improve
```

---

### Future: Reputation System

**Planned Algorithm:**

```typescript
// Reputation score: starts at 100
let reputation = 100;

// On task approval
reputation += (review_score - 5) * 2;
// Example: score=9 → +8 points, score=3 → -4 points

// On consensus match
if (annotator_matches_consensus) {
  reputation += 5;
}

// Use reputation for:
// - Task prioritization (high reputation → priority tasks)
// - Auto-assignment weighting
// - Leaderboards and gamification
```

---

## Summary

### Complete Process in One Page

```
┌─────────────────────────────────────────────────────────────┐
│  1. Manager creates project + adds team + configures AI     │
│  2. Manager uploads images → creates tasks                  │
│  3. Manager assigns tasks (manual/auto, min 2 annotators)   │
│  4. Annotators receive notifications                        │
│  5. Annotators annotate (with AI help if enabled)          │
│  6. Annotators submit tasks                                 │
│  7. Reviewers receive notifications                         │
│  8. Reviewers inspect and approve/reject/re-annotate       │
│  9. If rejected: task returns to annotator with feedback    │
│ 10. Project progress tracked: (submitted+approved)/total    │
│ 11. On completion: Manager exports YOLO dataset            │
└─────────────────────────────────────────────────────────────┘
```

### Key Business Rules

1. ✅ **Consensus Labeling**: Minimum 2 annotators per image
2. ✅ **Review Required**: All annotations must be reviewed
3. ✅ **Rejection Limit**: Max 3 rejects before task skipped
4. ✅ **Flexible Review**: Reviewer can re-annotate instead of reject
5. ✅ **Manager Override**: Can edit/delete tasks anytime
6. ✅ **AI Optional**: Per-project AI assistance toggle
7. ✅ **Manual Export**: Manager triggers export when ready
8. ✅ **Real-time Notifications**: All stakeholders notified of relevant events

---

**Maintained by:** V-Label Product Team  
**Next Steps:** See `02_requirements.md` for technical implementation details  
**Related Docs:** `03_architecture.md`, `04_database.md`, `05_api.md`
