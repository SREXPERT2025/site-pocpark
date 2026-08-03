import './puzzle2.css';

import { Puzzle2SelectionProvider } from './Puzzle2SelectionContext';

export default function PuzzleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Puzzle2SelectionProvider>{children}</Puzzle2SelectionProvider>;
}
