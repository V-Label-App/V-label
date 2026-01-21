# Annotation Workspace Refactor - Implementation Plan

## Overview
This plan outlines the step-by-step implementation of the annotation workspace refactor, migrating from custom canvas manipulation to Konva.js + Zustand architecture.

## Implementation Phases

---

## Phase 1: Foundation & Setup (2-3 days)

### 1.1 Install Dependencies
**File**: `client/package.json`

```bash
npm install konva react-konva zustand@4
npm install -D @types/konva
```

**Dependencies**:
- `konva`: Core canvas library
- `react-konva`: React bindings for Konva
- `zustand`: Lightweight state management

### 1.2 Create Folder Structure
**Directory**: `client/src/features/annotation/`

```
annotation/
├── pages/
│   └── WorkspacePage.tsx          # NEW: Main container
├── components/
│   ├── workspace/                 # NEW folder
│   ├── canvas/                    # NEW folder
│   ├── sidebar/                   # NEW folder
│   └── dialogs/                   # NEW folder
├── stores/                        # NEW folder
│   ├── useAnnotationStore.ts
│   ├── useCanvasStore.ts
│   └── useImageStore.ts
└── hooks/                         # NEW folder
    ├── useKonvaStage.ts
    ├── useAnnotationTools.ts
    └── useKeyboardShortcuts.ts
```

### 1.3 Create Zustand Stores
**Files**: 
- `stores/useAnnotationStore.ts`
- `stores/useCanvasStore.ts`
- `stores/useImageStore.ts`

**Implementation order**:
1. **CanvasStore**: Zoom, pan, tool selection
2. **AnnotationStore**: Annotations array, CRUD operations, undo/redo
3. **ImageStore**: Image navigation, current index

**Example skeleton**:
```typescript
// stores/useCanvasStore.ts
import { create } from 'zustand';

interface CanvasState {
  zoom: number;
  pan: { x: number; y: number };
  tool: 'select' | 'rectangle' | 'hand';
  
  setZoom: (zoom: number) => void;
  setPan: (pan: { x: number; y: number }) => void;
  setTool: (tool: 'select' | 'rectangle' | 'hand') => void;
  resetCanvas: () => void;
}

export const useCanvasStore = create<CanvasState>((set) => ({
  zoom: 100,
  pan: { x: 0, y: 0 },
  tool: 'select',
  
  setZoom: (zoom) => set({ zoom }),
  setPan: (pan) => set({ pan }),
  setTool: (tool) => set({ tool }),
  resetCanvas: () => set({ zoom: 100, pan: { x: 0, y: 0 } }),
}));
```

---

## Phase 2: Canvas Foundation (3-4 days)

### 2.1 Create Konva Stage Component
**File**: `components/canvas/WorkspaceCanvas.tsx`

**Features**:
- Initialize Konva Stage + Layer
- Handle zoom (wheel event)
- Handle pan (drag)
- Render background image
- Pass stage ref to other components

**Key code**:
```tsx
import { Stage, Layer, Image as KonvaImage } from 'react-konva';
import useImage from 'use-image';

export function WorkspaceCanvas() {
  const { zoom, pan } = useCanvasStore();
  const [image] = useImage('https://example.com/xray.jpg');
  
  return (
    <Stage
      width={window.innerWidth}
      height={window.innerHeight}
      scaleX={zoom / 100}
      scaleY={zoom / 100}
      x={pan.x}
      y={pan.y}
      draggable
    >
      <Layer>
        <KonvaImage image={image} />
        {/* Annotations will render here */}
      </Layer>
    </Stage>
  );
}
```

### 2.2 Create Annotation Layer
**File**: `components/canvas/AnnotationLayer.tsx`

**Responsibilities**:
- Subscribe to `useAnnotationStore`
- Render each annotation as `Rectangle` component
- Handle click to select annotation

### 2.3 Create Rectangle Component
**File**: `components/canvas/Rectangle.tsx`

**Features**:
- Konva.Rect for drawing
- Konva.Transformer for resize/rotate handles
- Color based on label
- Click handler to select
- Read-only mode (no transform controls)

**Example**:
```tsx
import { Rect, Transformer } from 'react-konva';

export function Rectangle({ annotation, isSelected, onSelect }) {
  const shapeRef = useRef(null);
  const trRef = useRef(null);
  
  useEffect(() => {
    if (isSelected && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer().batchDraw();
    }
  }, [isSelected]);
  
  return (
    <>
      <Rect
        ref={shapeRef}
        x={annotation.x}
        y={annotation.y}
        width={annotation.width}
        height={annotation.height}
        stroke={getLabelColor(annotation.label)}
        strokeWidth={3}
        fill={getLabelColor(annotation.label, 0.2)}
        onClick={onSelect}
        draggable={!isReadOnly}
      />
      {isSelected && <Transformer ref={trRef} />}
    </>
  );
}
```

---

## Phase 3: Tools & Interactions (2-3 days)

### 3.1 Implement Drawing Tool
**File**: `hooks/useAnnotationTools.ts`

**Logic**:
1. Mouse down: Start drawing (capture start point)
2. Mouse move: Update temp rectangle preview
3. Mouse up: Finalize annotation, add to store

**Integration**: `WorkspaceCanvas.tsx` listens to mouse events and calls hook functions.

### 3.2 Implement Transform Tool
**Already handled by Konva.Transformer in Rectangle component**

### 3.3 Implement Keyboard Shortcuts
**File**: `hooks/useKeyboardShortcuts.ts`

**Shortcuts**:
- `V`: Select tool
- `R`: Rectangle tool
- `H`: Hand tool
- `Del`: Delete selected
- `Ctrl+Z`: Undo
- `Ctrl+Shift+Z`: Redo
- `1-9`: Quick label (Normal=1, Abnormal=2, etc.)

**Implementation**:
```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'v') setTool('select');
    if (e.key === 'r') setTool('rectangle');
    if (e.key === 'Delete') deleteSelected();
    // ... more shortcuts
  };
  
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, []);
```

---

## Phase 4: UI Components (3-4 days)

### 4.1 Create Workspace Header
**File**: `components/workspace/WorkspaceHeader.tsx`

**Features**:
- Breadcrumb navigation
- Auto-save status indicator
- Submit/Skip buttons (Annotator mode)
- Approve/Reject buttons (Reviewer mode)

### 4.2 Create Toolbar
**File**: `components/workspace/WorkspaceToolbar.tsx`

**Features**:
- Tool buttons (Select, Rectangle, Hand)
- Undo/Redo buttons
- Zoom controls (+/- buttons)
- Zoom percentage display

**UI**:
```tsx
<div className="toolbar">
  <ToolButton icon={MousePointer} active={tool === 'select'} onClick={() => setTool('select')} />
  <ToolButton icon={Square} active={tool === 'rectangle'} onClick={() => setTool('rectangle')} />
  <ToolButton icon={Hand} active={tool === 'hand'} onClick={() => setTool('hand')} />
  <Separator />
  <ToolButton icon={Undo} onClick={handleUndo} disabled={!canUndo} />
  <ToolButton icon={Redo} onClick={handleRedo} disabled={!canRedo} />
</div>
```

### 4.3 Create Sidebar
**File**: `components/workspace/WorkspaceSidebar.tsx`

**Tabs**:
1. **Regions Tab**: List of annotations
2. **Discussion Tab**: Notes + comments

**Regions List** (`components/sidebar/RegionsList.tsx`):
- Map annotations to `RegionCard` components
- Click to select
- Delete button
- Label dropdown

### 4.4 Create Image Navigator
**File**: `components/workspace/ImageNavigator.tsx`

**Features**:
- Thumbnail carousel (use Swiper.js or custom)
- Previous/Next buttons
- Image counter (2 / 7)
- Click thumbnail to jump to image

**Layout**: Bottom of screen, fixed position

---

## Phase 5: Advanced Features (2-3 days)

### 5.1 Undo/Redo System
**File**: `stores/useAnnotationStore.ts`

**Implementation**:
- Use `immer` middleware for Zustand
- Track history stack (past, present, future)
- Actions: `undo()`, `redo()`, `addToHistory()`

**Example**:
```typescript
import { temporal } from 'zundo';

export const useAnnotationStore = create(
  temporal<AnnotationState>((set) => ({
    annotations: [],
    addAnnotation: (annotation) => set((state) => ({
      annotations: [...state.annotations, annotation]
    })),
    // ...
  }))
);

// Usage
const { undo, redo } = useAnnotationStore.temporal.getState();
```

### 5.2 Auto-save Mechanism
**File**: `hooks/useAutoSave.ts`

**Logic**:
- Subscribe to annotation store changes
- Debounce 2 seconds
- Call mock API (or console.log for now)
- Update save status in UI

---

## Phase 6: AI Integration (3-4 days)

### 6.1 AI Suggestion Button
**File**: `components/workspace/WorkspaceHeader.tsx`

Add button: "🤖 AI Scan Image"

### 6.2 AI Suggestion Dialog
**File**: `components/dialogs/AISuggestionDialog.tsx`

**Features**:
- Show loading spinner while AI processes
- Display suggested bounding boxes in a list
- Preview suggestion on canvas (overlay)
- Accept (add to annotations) or Reject (dismiss)

### 6.3 Mock AI Service
**File**: `services/ai-annotation.service.ts`

**Mock implementation**:
```typescript
export async function scanImageWithAI(imageUrl: string): Promise<Annotation[]> {
  await delay(2000); // Simulate processing
  
  return [
    { id: '1', label: 'Abnormal', x: 100, y: 150, width: 200, height: 120, ... },
    { id: '2', label: 'Normal', x: 350, y: 80, width: 180, height: 100, ... },
  ];
}
```

**Future**: Replace with actual API call to backend AI model.

---

## Phase 7: Integration & Polish (2-3 days)

### 7.1 Create Main Page
**File**: `pages/WorkspacePage.tsx`

**Composition**:
```tsx
export function WorkspacePage() {
  return (
    <div className="workspace-container">
      <WorkspaceHeader />
      <div className="workspace-body">
        <WorkspaceToolbar />
        <WorkspaceCanvas />
        <WorkspaceSidebar />
      </div>
      <ImageNavigator />
    </div>
  );
}
```

### 7.2 Update Routing
**File**: `routes/AppRoutes.tsx`

```tsx
<Route path="/workspace/:taskId" element={<WorkspacePage />} />
```

### 7.3 Visual Polish
- Add Framer Motion animations for panels
- Smooth transitions between images
- Loading skeletons for thumbnails
- Toast notifications for actions (saved, submitted, etc.)

### 7.4 Accessibility
- Add ARIA labels to all buttons
- Keyboard navigation for sidebar tabs
- Focus management (trap focus in dialogs)

---

## Phase 8: Testing & Migration (2-3 days)

### 8.1 Unit Tests
**Files**: `__tests__/stores/*.test.ts`

Test Zustand stores:
- Annotation CRUD operations
- Undo/Redo functionality
- Canvas zoom/pan

### 8.2 Component Tests
**Files**: `__tests__/components/*.test.tsx`

Test React components:
- Rectangle rendering
- Tool switching
- Keyboard shortcuts

### 8.3 Manual Testing Checklist
- [ ] Draw rectangle → save → reload → verify persisted
- [ ] Undo/Redo → verify history works
- [ ] Navigate images → verify state resets
- [ ] AI scan → verify suggestions appear
- [ ] Keyboard shortcuts → verify all hotkeys work
- [ ] Read-only mode (Reviewer) → verify no editing allowed

### 8.4 Performance Testing
- Load 100 annotations → verify no lag
- Zoom in/out rapidly → verify smooth rendering
- Pan across canvas → verify 60fps

### 8.5 Deprecate Old Workspace
1. Rename old `Workspace.tsx` → `WorkspaceOld.tsx`
2. Update route to point to new `WorkspacePage`
3. Add deprecation notice in old file
4. After 1 sprint of stability, delete old file

---

## Timeline Estimate

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 1: Setup | 2-3 days | None |
| Phase 2: Canvas | 3-4 days | Phase 1 |
| Phase 3: Tools | 2-3 days | Phase 2 |
| Phase 4: UI | 3-4 days | Phase 3 |
| Phase 5: Advanced | 2-3 days | Phase 4 |
| Phase 6: AI | 3-4 days | Phase 5 |
| Phase 7: Integration | 2-3 days | Phase 6 |
| Phase 8: Testing | 2-3 days | Phase 7 |
| **TOTAL** | **19-28 days** | (~4-6 weeks) |

---

## Risk Mitigation

### Risk 1: Konva.js Learning Curve
**Mitigation**: Allocate 1 day for Konva.js tutorial + sample projects before coding.

### Risk 2: State Management Complexity
**Mitigation**: Start with simple Zustand stores, iterate based on needs.

### Risk 3: Performance Issues with Many Annotations
**Mitigation**: Implement viewport culling (only render visible annotations).

### Risk 4: Breaking Changes During Migration
**Mitigation**: Keep old workspace functional until new one is 100% stable.

---

## Success Criteria
- ✅ All keyboard shortcuts work
- ✅ Undo/Redo up to 50 steps
- ✅ Support 100+ annotations without lag
- ✅ Smooth zoom (60fps)
- ✅ Auto-save within 2 seconds of change
- ✅ AI suggestions load within 3 seconds
- ✅ No console errors
- ✅ All unit tests pass (>80% coverage)

---

## Post-Launch Improvements (Future)
- [ ] Polygon annotation tool
- [ ] Real-time collaboration (WebSocket)
- [ ] Export to COCO/YOLO format
- [ ] Minimap overview
- [ ] Brightness/contrast adjustments
- [ ] Touch device support
