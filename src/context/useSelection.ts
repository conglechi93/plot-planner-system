import { useContext } from 'react';
import { SelectionContext } from './SelectionContext';
import type { SelectionState } from './SelectionContext';

export function useSelection(): SelectionState {
  const ctx = useContext(SelectionContext);
  if (!ctx) {
    throw new Error('useSelection must be used within a SelectionProvider');
  }
  return ctx;
}
