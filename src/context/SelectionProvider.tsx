import { useState } from 'react';
import { SelectionContext } from './SelectionContext';
import type { HouseInstance } from '../types/HouseInstance';

interface Props {
  children: React.ReactNode;
}

export function SelectionProvider({ children }: Props) {
  const [selectedHouse, setSelectedHouse] = useState<HouseInstance | null>(null);

  return (
    <SelectionContext.Provider value={{ selectedHouse, setSelectedHouse }}>
      {children}
    </SelectionContext.Provider>
  );
}
