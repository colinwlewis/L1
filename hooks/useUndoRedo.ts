import { useState, useCallback } from 'react';

export function useUndoRedo(initialValue: string) {
  const [history, setHistory] = useState<string[]>([initialValue]);
  const [index, setIndex] = useState(0);
  const [value, setValue] = useState(initialValue);

  const canUndo = index > 0;
  const canRedo = index < history.length - 1;

  const undo = useCallback(() => {
    if (canUndo) {
      const newIndex = index - 1;
      setIndex(newIndex);
      setValue(history[newIndex]);
    }
  }, [canUndo, index, history]);

  const redo = useCallback(() => {
    if (canRedo) {
      const newIndex = index + 1;
      setIndex(newIndex);
      setValue(history[newIndex]);
    }
  }, [canRedo, index, history]);

  const updateValue = useCallback((newValue: string) => {
    setValue(newValue);
  }, []);

  const saveSnapshot = useCallback(() => {
    setHistory((prev) => {
      // Avoid saving if the value hasn't effectively changed from the current history point
      if (prev[index] === value) return prev;

      const newHistory = prev.slice(0, index + 1);
      newHistory.push(value);
      return newHistory;
    });
    
    // We only increment index if the history was actually updated.
    // However, since we can't easily read the result of the setHistory functional update here,
    // we use a comprehensive check in the index setter or just rely on the logic that 
    // if we are calling saveSnapshot, we intend to move forward.
    // To be safe against the 'duplicate' check above:
    setIndex((prevIndex) => {
        // We need to access the *current* history to check duplication, but we are inside a state setter.
        // Simplified approach: explicit check before calling setters.
        return prevIndex; // Placeholder, see improved logic below
    });
  }, [value, index]);

  // Refined saveSnapshot to ensure sync
  const commit = useCallback(() => {
     if (history[index] !== value) {
        const newHistory = history.slice(0, index + 1);
        newHistory.push(value);
        setHistory(newHistory);
        setIndex(newHistory.length - 1);
     }
  }, [history, index, value]);

  const setAndSave = useCallback((newValue: string) => {
    setValue(newValue);
    // We create a new history entry immediately
    const newHistory = history.slice(0, index + 1);
    newHistory.push(newValue);
    setHistory(newHistory);
    setIndex(newHistory.length - 1);
  }, [history, index]);

  return {
    value,
    updateValue,
    commit,
    setAndSave,
    undo,
    redo,
    canUndo,
    canRedo
  };
}
