import { useEffect, useRef } from "react";
import { useAnnotationStore, useImageStore } from "../stores";
import type { Annotation } from "../stores/useAnnotationStore";
import { logger } from "../../../utils/logger";

/**
 * Hook to automatically save annotations when they change
 * @param saveDraft - The save function from useWorkspaceData
 * @param actualTimeSeconds - Current work duration in seconds
 * @param enabled - Whether auto-save is enabled (default: true)
 */
export const useAutoSave = (
  saveDraft: (
    annotations: Annotation[],
    note?: string,
    time?: number,
  ) => Promise<void>,
  actualTimeSeconds: number,
  enabled: boolean = true,
) => {
  const { annotations } = useAnnotationStore();
  const { setAutoSaveStatus } = useImageStore();

  const saveDraftRef = useRef(saveDraft);
  const timeRef = useRef(actualTimeSeconds);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track the last JSON string that was successfully saved or initialized
  const lastSavedJsonRef = useRef<string | null>(null);

  // Sync refs to avoid they being dependencies in the main effect
  useEffect(() => {
    saveDraftRef.current = saveDraft;
  }, [saveDraft]);

  useEffect(() => {
    timeRef.current = actualTimeSeconds;
  }, [actualTimeSeconds]);

  useEffect(() => {
    // 0. If auto-save is disabled, do nothing
    if (!enabled) {
      return;
    }

    const currentJson = JSON.stringify(annotations);

    // 1. Initial initialization - don't mark as unsaved
    if (lastSavedJsonRef.current === null) {
      lastSavedJsonRef.current = currentJson;
      logger.debug("Auto-save: Initialized with current annotations");
      return;
    }

    // 2. If nothing changed, do nothing
    if (currentJson === lastSavedJsonRef.current) {
      return;
    }

    // 3. Something changed!
    logger.debug("Auto-save: Change detected");
    setAutoSaveStatus("unsaved");

    // Clear any pending save
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    // Start a new debounce timer
    timerRef.current = setTimeout(async () => {
      try {
        logger.info("Auto-save: Saving draft...", {
          count: annotations.length,
          time: timeRef.current,
        });

        setAutoSaveStatus("saving");

        await saveDraftRef.current(annotations, undefined, timeRef.current);

        // Update the reference AFTER successful save
        lastSavedJsonRef.current = currentJson;
        setAutoSaveStatus("saved");
        logger.success("Auto-save: Saved successfully");
      } catch (error) {
        logger.error("Auto-save: Save failed", error);
        setAutoSaveStatus("unsaved");
      }
    }, 2000);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [annotations, enabled]); // Trigger when annotations or enabled flag changes
};
