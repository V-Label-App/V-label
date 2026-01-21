# Specification: Annotation Workspace Refactor

## 1. Overview
The goal is to **completely refactor the Annotation Workspace** to improve UX/UI, maintainability, and performance. The current implementation uses basic HTML/CSS for canvas manipulation, which is difficult to maintain and lacks advanced features. We will migrate to **Konva.js** (a powerful 2D canvas library) and **Zustand** (lightweight state management) to create a modern, modular, and scalable annotation interface.

## 2. User Stories
- **As an Annotator**, I want a smooth, responsive canvas with zoom/pan capabilities so I can annotate medical images efficiently.
- **As an Annotator**, I want keyboard shortcuts for common actions (Draw, Select, Delete, Undo/Redo) so I don't need to constantly click buttons.
- **As an Annotator**, I want to navigate through multiple images quickly with a thumbnail carousel.
- **As an Annotator**, I want AI-assisted suggestions (bounding box detection) to speed up my annotation workflow.
- **As a Developer**, I want a modular component structure so the codebase is easier to maintain and extend.
- **As a Reviewer**, I want to view annotations in read-only mode with all tools disabled.

## 3. Current Problems
1. **Monolithic Component**: `Workspace.tsx` is 973 lines - too complex, hard to maintain.
2. **Manual Canvas Manipulation**: Low-level DOM manipulation for drawing/editing regions is error-prone.
3. **Poor State Management**: useState/useReducer is not scalable for complex annotation state.
4. **Limited Features**: Only rectangle annotation, no advanced tools (polygon, AI suggestions).
5. **No Thumbnail Carousel**: Image navigation is basic (prev/next buttons only).
6. **Performance Issues**: Potential lag when handling many annotations (100+ regions).

## 4. Technical Architecture

### 4.1 New Technology Stack
| Component | Current | New |
|-----------|---------|-----|
| Canvas Library | Custom HTML/CSS | **Konva.js** (react-konva) |
| State Management | useState/useReducer | **Zustand** |
| UI Components | shadcn/ui | Keep existing |
| Animations | Framer Motion | Keep existing |
| Icons | Lucide React | Keep existing |

### 4.2 Component Structure (Modular Design)
```
features/annotation/
├── pages/
│   └── WorkspacePage.tsx          # Main container (routing, layout only)
├── components/
│   ├── workspace/
│   │   ├── WorkspaceHeader.tsx    # Breadcrumb, save status, submit buttons
│   │   ├── WorkspaceToolbar.tsx   # Tool selection (Select, Rectangle, Hand, Undo/Redo)
│   │   ├── WorkspaceCanvas.tsx    # Konva Stage + Layer (main drawing area)
│   │   ├── WorkspaceSidebar.tsx   # Tabs (Regions, Discussion)
│   │   └── ImageNavigator.tsx     # Thumbnail carousel + prev/next buttons
│   ├── canvas/
│   │   ├── AnnotationLayer.tsx    # Renders all annotations (Rectangles)
│   │   ├── Rectangle.tsx          # Single rectangle annotation (Konva.Rect)
│   │   ├── TransformControls.tsx  # Resize/rotate handles (Konva.Transformer)
│   │   └── Crosshair.tsx          # Custom cursor overlay
│   ├── sidebar/
│   │   ├── RegionsList.tsx        # List of annotations with edit/delete
│   │   ├── RegionCard.tsx         # Single annotation card
│   │   └── DiscussionPanel.tsx    # Notes + comments
│   └── dialogs/
│       └── AISuggestionDialog.tsx # AI-assisted annotation modal
├── stores/
│   ├── useAnnotationStore.ts      # Zustand store for annotations state
│   ├── useCanvasStore.ts          # Zustand store for canvas state (zoom, pan)
│   └── useImageStore.ts           # Zustand store for image navigation
└── hooks/
    ├── useKonvaStage.ts           # Custom hook for Konva stage
    ├── useAnnotationTools.ts      # Tools logic (draw, select, delete)
    └── useKeyboardShortcuts.ts    # Hotkeys handler
```

### 4.3 Data Models

#### Annotation Interface
```typescript
interface Annotation {
  id: string;
  label: string;              // "Normal", "Abnormal", "Uncertain"
  type: 'rectangle';          // Future: 'polygon', 'point'
  x: number;                  // Relative to image (0-1)
  y: number;
  width: number;
  height: number;
  visible: boolean;
  createdBy: string;
  createdAt: Date;
  aiSuggested?: boolean;      // Flag if AI suggested this box
}
```

#### Canvas State (Zustand)
```typescript
interface CanvasState {
  zoom: number;               // 50-500%
  pan: { x: number; y: number };
  tool: 'select' | 'rectangle' | 'hand';
  selectedAnnotationId: string | null;
  
  // Actions
  setZoom: (zoom: number) => void;
  setPan: (pan: { x: number; y: number }) => void;
  setTool: (tool: string) => void;
  selectAnnotation: (id: string | null) => void;
}
```

#### Image Navigation State
```typescript
interface ImageState {
  images: ImageTask[];
  currentIndex: number;
  
  // Actions
  goToNext: () => void;
  goToPrevious: () => void;
  jumpToImage: (index: number) => void;
}
```

## 5. Key Features

### 5.1 Required Features (Phase 1)
- [x] **Konva.js Integration**: Smooth canvas rendering with zoom/pan.
- [x] **Rectangle Annotation Tool**: Draw, resize, move, delete bounding boxes.
- [x] **Keyboard Shortcuts**:
  - `V`: Select tool
  - `R`: Rectangle tool
  - `H`: Hand/Pan tool
  - `Del/Backspace`: Delete selected annotation
  - `Ctrl+Z`: Undo
  - `Ctrl+Shift+Z`: Redo
  - `1-9`: Quick label assignment
  - `Alt+←/→`: Navigate images
- [x] **Thumbnail Carousel**: Bottom carousel with image thumbnails + status indicators.
- [x] **Zoom Controls**: Zoom in/out buttons + mouse wheel zoom.
- [x] **Auto-save**: Debounced auto-save every 2 seconds.
- [x] **Read-only Mode**: For Reviewer role (all tools disabled).

### 5.2 AI-Assisted Features (Phase 2)
- [ ] **AI Scan Image**: Button to send image to AI for bounding box suggestions.
- [ ] **AI Suggestion Dialog**: Show detected regions, allow accept/reject.
- [ ] **Auto-label Suggestions**: AI suggests label based on region content.

### 5.3 Future Enhancements (Phase 3+)
- [ ] Polygon annotation tool
- [ ] Point/Landmark annotation
- [ ] Region grouping/layering
- [ ] Export annotations (COCO/YOLO format)
- [ ] Real-time collaboration (multiple users)
- [ ] Minimap (overview in corner)

## 6. UX/UI Improvements

### 6.1 Visual Design
- **Dark Theme**: Keep existing slate-900 theme for reduced eye strain.
- **Smooth Animations**: Framer Motion for panel transitions, tool switches.
- **Visual Feedback**: 
  - Crosshair cursor when drawing
  - Highlight selected annotation
  - Loading states for AI suggestions
  - Toast notifications for save/submit

### 6.2 Performance Optimizations
- **Virtualized Carousel**: Only render visible thumbnails.
- **Lazy Annotation Rendering**: Only render visible annotations (viewport culling).
- **Debounced Zoom/Pan**: Throttle canvas updates to 60fps.
- **Konva Layer Optimization**: Separate layers for image, annotations, controls.

### 6.3 Accessibility
- **Keyboard-first**: All actions accessible via keyboard.
- **ARIA labels**: Screen reader support for all interactive elements.
- **Focus indicators**: Clear visual feedback for keyboard navigation.

## 7. Backend API (Mock for Now)

### 7.1 Endpoints (Future Implementation)
```typescript
GET    /api/tasks/:taskId/annotations     // Fetch existing annotations
POST   /api/tasks/:taskId/annotations     // Save annotations
PUT    /api/tasks/:taskId/submit          // Submit task
POST   /api/tasks/:taskId/ai-suggest      // AI scan image
GET    /api/projects/:projectId/images    // Fetch image list
```

### 7.2 Mock Data Structure
For now, we'll use mock data in `stores/` to simulate API responses.

## 8. Security & Validation
- **Role-Based Access**: Annotators can edit, Reviewers can view-only, Admins can view/edit.
- **Input Validation**: All annotation coordinates must be within image bounds (0-1 range).
- **Prevent Data Loss**: Show confirmation dialog when navigating with unsaved changes.

## 9. Testing Strategy
- **Unit Tests**: Test Zustand stores, hooks, utility functions.
- **Component Tests**: Test individual components (AnnotationLayer, Rectangle).
- **Integration Tests**: Test full workflow (draw → save → navigate → load).
- **E2E Tests** (Future): Playwright tests for complete annotation workflow.

## 10. Migration Strategy
1. **Phase 1**: Create new workspace structure in parallel (don't touch old code).
2. **Phase 2**: Migrate one feature at a time (Canvas → Sidebar → Navigation).
3. **Phase 3**: Switch routing to new workspace, deprecate old one.
4. **Phase 4**: Remove old `Workspace.tsx` after full verification.

## 11. Success Metrics
- **Code Maintainability**: Reduce main component from 973 lines to <200 lines.
- **Performance**: Support 100+ annotations without lag (<16ms per frame).
- **User Satisfaction**: Reduce annotation time by 30% (via keyboard shortcuts + AI assist).
- **Developer Experience**: New developers can understand and modify components in <1 hour.

## 12. Non-Goals (Out of Scope)
- ❌ Real backend API integration (mock only for now)
- ❌ Mobile/touch support (desktop only)
- ❌ Video annotation
- ❌ 3D medical imaging (DICOM viewers)
- ❌ Advanced image processing (brightness/contrast adjustments)
