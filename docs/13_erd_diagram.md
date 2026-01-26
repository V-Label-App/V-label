# V-Label Database ERD - Phase 2: Production Ready

> Complete Entity Relationship Diagram with all 22 tables and relationships

**Last Updated:** 2026-01-24
**Phase:** Phase 2 - Production Ready
**Total Tables:** 22
**Total Relationships:** 40+

---

## 📊 Complete ERD Diagram

```mermaid
erDiagram
    %% ============================================================================
    %% V-LABEL DATABASE ERD - PHASE 2: PRODUCTION READY
    %% Complete Entity Relationship Diagram with all 22 tables
    %% ============================================================================

    %% ============================================================================
    %% 1. USER MANAGEMENT
    %% ============================================================================

    User {
        uuid id PK
        string email UK "Unique email"
        string google_id UK "Google OAuth ID"
        string password_hash "Nullable for OAuth"
        enum provider "LOCAL | GOOGLE"
        string full_name
        string avatar_url
        string phone_number
        enum role "ADMIN | MANAGER | REVIEWER | ANNOTATOR"
        boolean is_active
        float reputation_score "Gamification score"
        int total_tasks_done
        timestamp created_at
        timestamp updated_at
    }

    PasswordResetToken {
        uuid id PK
        uuid user_id FK
        string token UK
        timestamp expires_at
        boolean used
        timestamp created_at
    }

    %% ============================================================================
    %% 2. PROJECT WORKFLOW
    %% ============================================================================

    Project {
        uuid id PK
        string name
        text description
        jsonb label_config "Label definitions"
        timestamp deadline
        boolean enable_ai_assistance
        enum status "DRAFT | ACTIVE | PAUSED | COMPLETED | ARCHIVED"
        timestamp created_at
        timestamp updated_at
    }

    ProjectMember {
        uuid id PK
        uuid project_id FK
        uuid user_id FK
        enum project_role "PROJECT_MANAGER | REVIEWER | ANNOTATOR"
        timestamp joined_at
    }

    Dataset {
        uuid id PK
        uuid project_id FK
        string name
        text description
        string source "camera_A | web_scraping | manual"
        jsonb source_metadata
        int total_images
        int processed_images
        uuid uploaded_by FK
        timestamp created_at
        timestamp updated_at
    }

    Image {
        uuid id PK
        uuid project_id FK
        uuid dataset_id FK
        string original_filename
        string storage_url
        string storage_path
        int width "CRITICAL for ML export"
        int height "CRITICAL for ML export"
        int channels "RGB=3, Gray=1"
        bigint file_size_bytes
        string format "jpg | png | webp"
        string checksum "SHA-256"
        uuid uploaded_by FK
        timestamp uploaded_at
    }

    Task {
        uuid id PK
        uuid project_id FK
        uuid image_id FK "Reference to Image table"
        string image_url "Deprecated - use image_id"
        enum status "TODO | IN_PROGRESS | DONE"
        enum priority "LOW | MEDIUM | HIGH | URGENT"
        timestamp deadline
        enum difficulty_level "EASY | NORMAL | HARD | EXPERT_ONLY"
    }

    TaskAssignment {
        uuid id PK
        uuid task_id FK
        uuid annotator_id FK
        uuid reviewer_id FK "Nullable initially"
        enum status "ASSIGNED | IN_PROGRESS | SUBMITTED | APPROVED | REJECTED | SKIPPED"
        timestamp deadline
        jsonb annotations "Pixel + Normalized coordinates"
        boolean is_ai_generated
        uuid ai_model_id FK
        float ai_confidence
        text annotator_note
        int review_score "1-10"
        text review_comment
        int rejection_count "Track rejections"
        int max_rejections
        text skip_reason
        int estimated_time_minutes
        int actual_time_seconds
        uuid assigned_by FK
        enum assignment_method "MANUAL | AUTO_ROUND_ROBIN | AUTO_LEAST_BUSY | AUTO_SKILL_BASED"
        timestamp created_at
        timestamp updated_at
    }

    AnnotationConsensus {
        uuid id PK
        uuid task_id FK UK "One per task"
        jsonb final_annotations "Final annotation for ML export"
        string consensus_method "single_annotator | majority_vote | weighted_average"
        uuid-array source_assignment_ids "Source assignments"
        float agreement_score "Inter-Annotator Agreement 0-1"
        boolean is_verified
        uuid verified_by FK
        timestamp verified_at
        timestamp created_at
        timestamp updated_at
    }

    TaskReassignment {
        uuid id PK
        uuid task_id FK
        uuid old_annotator_id FK
        uuid new_annotator_id FK
        string reason "REJECTED_TOO_MANY | USER_SKIPPED | USER_UNAVAILABLE"
        uuid reassigned_by FK
        text notes
        timestamp created_at
    }

    %% ============================================================================
    %% 3. ML EXPORT & AI
    %% ============================================================================

    Export {
        uuid id PK
        uuid project_id FK
        string format "yolo | coco | pascal_voc | csv | json"
        int version
        string split_type "train_val_test | train_val"
        jsonb split_ratio "train:0.7, val:0.2, test:0.1"
        jsonb filter_criteria "is_verified:true, min_score:8"
        int total_images
        int total_annotations
        jsonb class_distribution "person:450, car:320"
        string file_url
        bigint file_size_bytes
        string checksum
        uuid exported_by FK
        int download_count
        timestamp created_at
        jsonb label_config_snapshot "Config at export time"
    }

    AiModel {
        uuid id PK
        string name "YOLOv8 | SAM | GPT-4V"
        string version
        string model_type "object_detection | segmentation"
        jsonb config "confidence_threshold, nms_threshold"
        jsonb metrics "mAP, precision, recall"
        boolean is_active
        string endpoint_url
        timestamp created_at
        timestamp updated_at
    }

    %% ============================================================================
    %% 4. AUTO-ASSIGNMENT & WORKLOAD
    %% ============================================================================

    AssignmentRule {
        uuid id PK
        uuid project_id FK UK "One per project"
        boolean is_auto_assign_enabled
        string assignment_strategy "ROUND_ROBIN | LEAST_BUSY | SKILL_BASED"
        boolean auto_assign_reviewer
        int reviewer_delay_hours
        int max_tasks_per_annotator
        int max_tasks_per_reviewer
        float min_annotator_reputation
        float min_reviewer_reputation
        int max_rejections_before_reassign
        boolean auto_reassign_on_skip
        timestamp created_at
        timestamp updated_at
    }

    UserWorkload {
        uuid id PK
        uuid user_id FK
        uuid project_id FK
        int assigned_tasks "Current count"
        int in_progress_tasks
        int pending_review_tasks "For reviewers"
        int max_concurrent_tasks
        string availability_status "AVAILABLE | BUSY | OFFLINE | ON_VACATION"
        timestamp last_assigned_at
        timestamp updated_at
    }

    %% ============================================================================
    %% 5. COMMUNICATION
    %% ============================================================================

    Notification {
        uuid id PK
        uuid user_id FK
        enum type "TASK_ASSIGNED | TASK_SUBMITTED | TASK_APPROVED | TASK_REJECTED"
        string title
        text message
        jsonb metadata "Contextual data"
        boolean is_read
        timestamp created_at
    }

    ChatMessage {
        uuid id PK
        uuid project_id FK
        uuid sender_id FK
        text content
        timestamp created_at
    }

    NotificationTemplate {
        uuid id PK
        enum type UK
        string title_template
        text message_template
        jsonb variables
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }

    %% ============================================================================
    %% 6. SYSTEM & AUDIT
    %% ============================================================================

    AuditLog {
        uuid id PK
        string action
        uuid actor_id
        uuid target_id
        jsonb metadata
        timestamp created_at
    }

    SystemConfig {
        string key PK
        jsonb value
        timestamp updated_at
    }

    %% ============================================================================
    %% 7. EMAIL SERVICE
    %% ============================================================================

    EmailTemplate {
        uuid id PK
        string type UK
        string subject
        text html_body
        text text_body
        jsonb variables
        boolean enabled
        timestamp created_at
        timestamp updated_at
    }

    EmailConfig {
        uuid id PK
        string key UK
        string provider "smtp | sendgrid | aws_ses"
        jsonb config
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }

    EmailLog {
        uuid id PK
        string to
        string from
        string subject
        string template_type
        string status "sent | failed | pending"
        text error
        timestamp sent_at
        timestamp created_at
    }

    %% ============================================================================
    %% 8. LABEL MANAGEMENT
    %% ============================================================================

    LabelCategory {
        uuid id PK
        string name UK
        text description
        timestamp created_at
    }

    Label {
        uuid id PK
        string name
        string color "Hex color #FF0000"
        boolean is_global
        uuid category_id FK
        uuid created_by FK
        timestamp created_at
    }

    ProjectLabel {
        uuid id PK
        uuid project_id FK
        uuid label_id FK
        timestamp created_at
    }

    LabelRequest {
        uuid id PK
        uuid project_id FK
        uuid requested_by FK
        string label_name
        string suggested_color
        text reason
        enum status "PENDING | APPROVED | REJECTED"
        uuid reviewed_by FK
        timestamp reviewed_at
        timestamp created_at
    }

    %% ============================================================================
    %% RELATIONSHIPS
    %% ============================================================================

    %% User relationships
    User ||--o{ PasswordResetToken : "requests"
    User ||--o{ ProjectMember : "joins"
    User ||--o{ TaskAssignment : "annotates"
    User ||--o{ TaskAssignment : "reviews"
    User ||--o{ TaskAssignment : "assigns"
    User ||--o{ Notification : "receives"
    User ||--o{ ChatMessage : "sends"
    User ||--o{ Image : "uploads"
    User ||--o{ Dataset : "creates"
    User ||--o{ Export : "exports"
    User ||--o{ AnnotationConsensus : "verifies"
    User ||--o{ UserWorkload : "has"
    User ||--o{ TaskReassignment : "from"
    User ||--o{ TaskReassignment : "to"
    User ||--o{ TaskReassignment : "performs"
    User ||--o{ Label : "creates"
    User ||--o{ LabelRequest : "requests"
    User ||--o{ LabelRequest : "reviews"

    %% Project relationships
    Project ||--o{ ProjectMember : "contains"
    Project ||--o{ Task : "has"
    Project ||--o{ ChatMessage : "contains"
    Project ||--o{ Dataset : "contains"
    Project ||--o{ Image : "contains"
    Project ||--o{ Export : "generates"
    Project ||--|| AssignmentRule : "configures"
    Project ||--o{ UserWorkload : "tracks"
    Project ||--o{ ProjectLabel : "has"
    Project ||--o{ LabelRequest : "has"

    %% Dataset & Image relationships
    Dataset ||--o{ Image : "groups"
    Image ||--o{ Task : "referenced-in"

    %% Task workflow relationships
    Task ||--o{ TaskAssignment : "assigned-to"
    Task ||--|| AnnotationConsensus : "has-final"
    Task ||--o{ TaskReassignment : "reassignments"

    %% TaskAssignment relationships
    TaskAssignment }o--|| AiModel : "uses"

    %% Label relationships
    LabelCategory ||--o{ Label : "contains"
    Label ||--o{ ProjectLabel : "used-in"

    %% Junction tables
    ProjectMember }o--|| User : "user"
    ProjectMember }o--|| Project : "project"
    ProjectLabel }o--|| Project : "project"
    ProjectLabel }o--|| Label : "label"

    %% Email relationships
    EmailTemplate ||--o{ EmailLog : "uses"
```

---

## 📋 Table Summary by Category

### 1. User Management (2 tables)
- `users` - User accounts, authentication, roles, reputation
- `password_reset_tokens` - Secure password recovery tokens

### 2. Project Workflow (12 tables) ⭐ PHASE 2 ENHANCED
- `projects` - Labeling projects with configurations
- `project_members` - User-project associations with roles
- `datasets` - Image grouping by upload batch
- `images` - Image metadata with dimensions (CRITICAL for ML)
- `tasks` - Individual annotation tasks
- `task_assignments` - Assignment with AI tracking
- `annotation_consensus` - Final annotations for export
- `task_reassignments` - Reassignment audit trail
- `exports` - ML dataset exports tracking
- `ai_models` - AI model configurations
- `assignment_rules` - Auto-assignment configurations
- `user_workload` - Real-time workload balancing

### 3. Communication (3 tables)
- `notifications` - In-app notifications
- `chat_messages` - Project-based team chat
- `notification_templates` - Notification templates

### 4. System & Audit (2 tables)
- `audit_logs` - Action tracking
- `system_configs` - System configurations

### 5. Email Service (3 tables)
- `email_templates` - Email templates
- `email_configs` - SMTP configurations
- `email_logs` - Email delivery logs

### 6. Label Management (4 tables)
- `label_categories` - Label categories
- `labels` - Global and project labels
- `project_labels` - Project-label associations
- `label_requests` - Label creation requests

---

## 🔗 Key Relationships

### Core Workflow Chain
```
User → ProjectMember → Project → Dataset → Image → Task
                                              ↓
                                        TaskAssignment
                                              ↓
                                    AnnotationConsensus
                                              ↓
                                           Export
```

### Auto-Assignment Flow
```
AssignmentRule → UserWorkload → TaskAssignment
                      ↓
                 Task Balancing
```

### Quality Control Flow
```
TaskAssignment (multiple) → AnnotationConsensus → Export
```

---

## ⭐ Phase 2 Highlights

### Critical for ML Export
1. **`images` table** - Stores `width` and `height` for coordinate normalization
2. **`annotation_consensus` table** - Final annotation after quality control
3. **Normalized coordinates** in `annotations` JSONB field

### Enhanced Workflow
1. **`assignment_rules`** - Auto-assignment configuration
2. **`user_workload`** - Real-time workload tracking
3. **`task_reassignments`** - Complete audit trail

### AI Integration
1. **`ai_models`** - Track AI models and performance
2. **`task_assignments.ai_model_id`** - Link assignments to AI models
3. **AI confidence scores** - Track AI assistance quality

---

## 📊 Statistics

| Metric | Count |
|--------|-------|
| **Total Tables** | 22 |
| **Total Enums** | 10 |
| **Total Indexes** | 30+ |
| **Total Foreign Keys** | 25+ |
| **JSONB Fields** | 15+ |
| **Unique Constraints** | 12+ |

---

## 🎯 How to View This Diagram

### Option 1: GitHub (Recommended)
- Push to GitHub
- View this `.md` file directly
- GitHub renders Mermaid diagrams automatically

### Option 2: VS Code
1. Install extension: "Markdown Preview Mermaid Support"
2. Open this file
3. Press `Cmd+Shift+V` (Mac) or `Ctrl+Shift+V` (Windows)

### Option 3: Mermaid Live Editor
1. Go to https://mermaid.live
2. Copy the mermaid code from this file
3. Paste and view interactively

### Option 4: Export to Image
```bash
# Using mermaid-cli
npm install -g @mermaid-js/mermaid-cli
mmdc -i docs/ERD_Phase2_Complete.mmd -o docs/ERD_Phase2.png
```

---

## 📝 Related Documentation

- [Complete Database Documentation](./04_database.md)
- [Migration Guide](../server/prisma/migrations/20260124_phase2_enhanced_ml_export_and_workflow/README.md)
- [Prisma Schema](../server/prisma/schema.prisma)

---

**Last Updated:** 2026-01-24
**Maintained by:** V-Label Development Team
