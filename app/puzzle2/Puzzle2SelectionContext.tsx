'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

type Puzzle2SelectionContextValue = {
  selected: string[];
  toggle: (value: string) => void;
  clear: () => void;
};

const Puzzle2SelectionContext = createContext<Puzzle2SelectionContextValue | null>(null);

export function Puzzle2SelectionProvider({ children }: { children: React.ReactNode }) {
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = useCallback((value: string) => {
    setSelected((current) => (
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value]
    ));
  }, []);

  const clear = useCallback(() => setSelected([]), []);
  const value = useMemo(() => ({ selected, toggle, clear }), [clear, selected, toggle]);

  return (
    <Puzzle2SelectionContext.Provider value={value}>
      {children}
    </Puzzle2SelectionContext.Provider>
  );
}

export function usePuzzle2Selection() {
  const context = useContext(Puzzle2SelectionContext);
  if (!context) throw new Error('Puzzle2SelectionProvider is required');
  return context;
}
