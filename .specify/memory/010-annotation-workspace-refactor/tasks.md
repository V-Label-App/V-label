# Tasks: Annotation Workspace Refactor

## Phase 1: Foundation & Setup
- [ ] **Dependencies**
    - [ ] Install `konva`, `react-konva`, `zustand`
    - [ ] Install dev dependencies: `@types/konva`
- [ ] **Folder Structure**
    - [ ] Create `annotation/pages/` folder
    - [ ] Create `annotation/components/workspace/` folder
    - [ ] Create `annotation/components/canvas/` folder
    - [ ] Create `annotation/components/sidebar/` folder
    - [ ] Create `annotation/components/dialogs/` folder
    - [ ] Create `annotation/stores/` folder
    - [ ] Create `annotation/hooks/` folder
- [ ] **Zustand Stores**
    - [ ] Create `useCanvasStore.ts` (zoom, pan, tool)
    - [ ] Create `useAnnotationStore.ts` (annotations, CRUD, undo/redo)
    - [ ] Create `useImageStore.ts` (image navigation)

---

## Phase 2: Canvas Foundation
- [ ] **Konva Stage**
    - [ ] Create `WorkspaceCanvas.tsx` component
    - [ ] Initialize Konva Stage + Layer
    - [ ] Load and display background image (use `use-image` hook)
    - [ ] Implement zoom (mouse wheel event)
    - [ ] Implement pan (drag on canvas)
- [ ] **Annotation Rendering**
    - [ ] Create `AnnotationLayer.tsx` component
    - [ ] Subscribe to `useAnnotationStore`
    - [ ] Render each annotation as `Rectangle` component
- [ ] **Rectangle Component**
    - [ ] Create `Rectangle.tsx` (Konva.Rect)
    - [ ] Add Konva.Transformer for resize/rotate
    - [ ] Implement color mapping (label → color)
    - [ ] Handle selection (click event)
    - [ ] Handle drag to move
    - [ ] Read-only mode (disable transform)

---

## Phase 3: Tools & Interactions
- [ ] **Drawing Tool**
    - [ ] Create `useAnnotationTools.ts` hook
    - [ ] Implement rectangle draw logic:
        - [ ] Mouse down: Capture start point
        - [ ] Mouse move: Update temp rectangle
        - [ ] Mouse up: Finalize and save annotation
    - [ ] Integrate with `WorkspaceCanvas`
- [ ] **Selection Tool**
    - [ ] Handle click to select annotation
    - [ ] Show transform controls on selected
    - [ ] Deselect on background click
- [ ] **Pan Tool**
    - [ ] Enable drag on Stage
    - [ ] Update `useCanvasStore.pan`
- [ ] **Keyboard Shortcuts**
    - [ ] Create `useKeyboardShortcuts.ts` hook
    - [ ] Implement shortcuts:
        - [ ] `V`: Select tool
        - [ ] `R`: Rectangle tool
        - [ ] `H`: Hand tool
        - [ ] `Del/Backspace`: Delete selected
        - [ ] `Ctrl+Z`: Undo
        - [ ] `Ctrl+Shift+Z`: Redo
        - [ ] `1-9`: Quick label assignment
        - [ ] `Alt+←/→`: Navigate images

---

## Phase 4: UI Components
- [ ] **Workspace Header**
    - [ ] Create `WorkspaceHeader.tsx`
    - [ ] Add breadcrumb navigation
    - [ ] Add auto-save status indicator
    - [ ] Add Submit/Skip buttons (Annotator mode)
    - [ ] Add Approve/Reject buttons (Reviewer mode)
- [ ] **Toolbar**
    - [ ] Create `WorkspaceToolbar.tsx`
    - [ ] Add tool selection buttons (Select, Rectangle, Hand)
    - [ ] Add Undo/Redo buttons
    - [ ] Add Zoom controls (+/- buttons)
    - [ ] Display zoom percentage
- [ ] **Sidebar**
    - [ ] Create `WorkspaceSidebar.tsx` (Tab container)
    - [ ] Create `RegionsList.tsx` (Regions tab)
    - [ ] Create `RegionCard.tsx` (Individual annotation item)
    - [ ] Create `DiscussionPanel.tsx` (Notes + comments)
    - [ ] Implement tab switching (Regions ↔ Discussion)
- [ ] **Image Navigator**
    - [ ] Create `ImageNavigator.tsx`
    - [ ] Implement thumbnail carousel (bottom bar)
    - [ ] Add Previous/Next buttons
    - [ ] Add image counter (e.g., "2 / 7")
    - [ ] Handle click to jump to image
    - [ ] Show status indicators on thumbnails (approved, rejected, etc.)

---

## Phase 5: Advanced Features
- [ ] **Undo/Redo System**
    - [ ] Add `zundo` middleware to `useAnnotationStore`
    - [ ] Implement `undo()` action
    - [ ] Implement `redo()` action
    - [ ] Track history (up to 50 steps)
- [ ] **Auto-save**
    - [ ] Create `useAutoSave.ts` hook
    - [ ] Subscribe to annotation changes
    - [ ] Debounce 2 seconds
    - [ ] Call mock save API (console.log for now)
    - [ ] Update save status in Header
- [ ] **Unsaved Changes Warning**
    - [ ] Detect unsaved changes when navigating
    - [ ] Show confirmation dialog before leaving

---

## Phase 6: AI Integration
- [ ] **AI Scan Button**
    - [ ] Add "🤖 AI Scan Image" button to Header
    - [ ] Handle click to open AI dialog
- [ ] **AI Suggestion Dialog**
    - [ ] Create `AISuggestionDialog.tsx`
    - [ ] Show loading spinner during AI processing
    - [ ] Display suggested bounding boxes in list
    - [ ] Preview suggestion on canvas (overlay)
    - [ ] Implement Accept/Reject actions
- [ ] **Mock AI Service**
    - [ ] Create `ai-annotation.service.ts`
    - [ ] Implement `scanImageWithAI()` function (mock data)
    - [ ] Simulate 2-second delay
    - [ ] Return mock annotations

---

## Phase 7: Integration & Polish
- [ ] **Main Page**
    - [ ] Create `WorkspacePage.tsx`
    - [ ] Compose all components (Header, Toolbar, Canvas, Sidebar, Navigator)
    - [ ] Handle layout (CSS Grid or Flexbox)
- [ ] **Routing**
    - [ ] Update `AppRoutes.tsx`
    - [ ] Add route: `/workspace/:taskId`
    - [ ] Pass `taskId` to `WorkspacePage`
- [ ] **Visual Polish**
    - [ ] Add Framer Motion animations for panels
    - [ ] Smooth image transitions
    - [ ] Loading skeletons for thumbnails
    - [ ] Toast notifications (save, submit, etc.)
- [ ] **Accessibility**
    - [ ] Add ARIA labels to all buttons
    - [ ] Keyboard navigation for tabs
    - [ ] Focus management in dialogs

---

## Phase 8: Testing & Migration
- [ ] **Unit Tests**
    - [ ] Test `useCanvasStore` (zoom, pan, tool switching)
    - [ ] Test `useAnnotationStore` (CRUD, undo/redo)
    - [ ] Test `useImageStore` (navigation)
- [ ] **Component Tests**
    - [ ] Test `Rectangle` rendering
    - [ ] Test tool switching
    - [ ] Test keyboard shortcuts
- [ ] **Manual Testing**
    - [ ] Draw rectangle → save → reload → verify persistence
    - [ ] Undo/Redo → verify history works correctly
    - [ ] Navigate images → verify state resets
    - [ ] AI scan → verify suggestions appear
    - [ ] All keyboard shortcuts work
    - [ ] Read-only mode (Reviewer) → verify no editing allowed
- [ ] **Performance Testing**
    - [ ] Load 100 annotations → verify no lag
    - [ ] Zoom in/out rapidly → verify smooth rendering (60fps)
    - [ ] Pan across canvas → verify no stutter
- [ ] **Migration**
    - [ ] Rename old `Workspace.tsx` → `WorkspaceOld.tsx`
    - [ ] Update routes to point to new `WorkspacePage`
    - [ ] Add deprecation notice in old file
    - [ ] Monitor for issues (1 sprint)
    - [ ] Delete old workspace file

---

## Future Enhancements (Phase 9+)
- [ ] Polygon annotation tool
- [ ] Point/Landmark annotation
- [ ] Real-time collaboration (WebSocket)
- [ ] Export annotations (COCO/YOLO format)
- [ ] Minimap overview (corner of canvas)
- [ ] Brightness/contrast adjustments
- [ ] Copy/Paste annotations
- [ ] Region grouping/layering
- [ ] Touch device support (mobile/tablet)
