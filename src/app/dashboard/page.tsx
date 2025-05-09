"use client";

import { BoardView } from './components/board/BoardView';

export default function DashboardPage() {
  // BoardView now gets active board data from useBoards context
  return (
    <div className="h-full">
      <BoardView />
    </div>
  );
}
