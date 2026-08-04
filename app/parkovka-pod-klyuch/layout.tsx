import '@/app/puzzle2/puzzle2.css';

import { Puzzle2SelectionProvider } from '@/app/puzzle2/Puzzle2SelectionContext';

export default function TurnkeyParkingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Puzzle2SelectionProvider>{children}</Puzzle2SelectionProvider>;
}
