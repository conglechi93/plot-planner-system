import { createContext } from 'react';
import type { HouseInstance } from '../types/HouseInstance';

export interface SelectionState {
  selectedHouse: HouseInstance | null;
  setSelectedHouse: (h: HouseInstance | null) => void;
}

export const SelectionContext = createContext<SelectionState | null>(null);
