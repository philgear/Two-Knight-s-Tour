import { Injectable, signal, computed } from '@angular/core';

export interface Position {
  r: number;
  c: number;
}

@Injectable({
  providedIn: 'root'
})
export class GameService {
  readonly boardSize = 8;
  
  // State
  // We now support multiple paths (one per knight)
  paths = signal<Position[][]>([[]]);
  activeKnight = signal<number>(0);

  // Computed state for the board grid
  // Returns: -1 (empty), 0 (Knight 1), 1 (Knight 2), etc.
  boardState = computed(() => {
    const grid = Array(this.boardSize).fill(null).map(() => Array(this.boardSize).fill(-1));
    const currentPaths = this.paths();
    
    currentPaths.forEach((path, knightIndex) => {
      path.forEach(pos => {
        grid[pos.r][pos.c] = knightIndex;
      });
    });
    return grid;
  });

  // Current position of the ACTIVE knight
  currentPos = computed(() => {
    const p = this.paths()[this.activeKnight()];
    return p.length > 0 ? p[p.length - 1] : null;
  });
  
  // Total moves (sum of all paths)
  totalMoves = computed(() => {
    return this.paths().reduce((acc, p) => acc + p.length, 0);
  });

  // Actions
  reset() {
    this.paths.set([[]]);
    this.activeKnight.set(0);
  }

  addKnight() {
    if (this.paths().length < 2) {
      this.paths.update(p => [...p, []]);
      this.activeKnight.set(1);
    }
  }

  setActiveKnight(index: number) {
    if (index >= 0 && index < this.paths().length) {
      this.activeKnight.set(index);
    }
  }

  undo() {
    const idx = this.activeKnight();
    const allPaths = this.paths();
    const currentPath = allPaths[idx];

    if (currentPath.length === 0) return;

    // Remove last move from active knight
    const newPath = currentPath.slice(0, -1);
    
    this.paths.update(p => {
      const copy = [...p];
      copy[idx] = newPath;
      return copy;
    });
  }

  moveKnight(r: number, c: number) {
    if (r < 0 || r >= this.boardSize || c < 0 || c >= this.boardSize) return;
    
    const current = this.currentPos();
    
    if (!current) {
      // First move for this knight
      // Check if square is occupied by ANY knight
      if (this.boardState()[r][c] === -1) {
        this.commitMove(r, c);
      }
    } else {
      if (this.isValidMove(current, { r, c })) {
        this.commitMove(r, c);
      }
    }
  }

  private commitMove(r: number, c: number) {
    // Determine if this is a loop closure for the active knight
    const idx = this.activeKnight();
    const path = this.paths()[idx];
    const isStart = path.length > 0 && path[0].r === r && path[0].c === c;
    const occupiedBy = this.boardState()[r][c];

    // If occupied by someone else, or by self (and not start), abort
    if (occupiedBy !== -1 && !isStart) return;
    if (occupiedBy !== -1 && isStart && occupiedBy !== idx) return; // Should be covered by first check, but explicit safety

    // Prevent double clicking same square
    const current = this.currentPos();
    if (current && current.r === r && current.c === c) return;

    this.paths.update(p => {
      const copy = [...p];
      copy[idx] = [...copy[idx], { r, c }];
      return copy;
    });
  }

  private isValidMove(from: Position, to: Position): boolean {
    const idx = this.activeKnight();
    const path = this.paths()[idx];
    const isStart = path.length > 0 && path[0].r === to.r && path[0].c === to.c;
    
    const occupiedBy = this.boardState()[to.r][to.c];

    // Move invalid if occupied, UNLESS it's the start of THIS knight (closing loop)
    if (occupiedBy !== -1) {
      if (occupiedBy !== idx) return false; // Occupied by other knight
      if (!isStart) return false; // Occupied by self, not start
    }

    const dr = Math.abs(from.r - to.r);
    const dc = Math.abs(from.c - to.c);
    return (dr === 2 && dc === 1) || (dr === 1 && dc === 2);
  }

  getPossibleMoves(from: Position): Position[] {
    const moves: Position[] = [];
    const offsets = [
      [-2, -1], [-2, 1], [-1, -2], [-1, 2],
      [1, -2], [1, 2], [2, -1], [2, 1]
    ];
    
    const idx = this.activeKnight();
    const path = this.paths()[idx];
    const start = path.length > 0 ? path[0] : null;
    const grid = this.boardState();

    for (const [dr, dc] of offsets) {
      const nr = from.r + dr;
      const nc = from.c + dc;
      if (nr >= 0 && nr < this.boardSize && nc >= 0 && nc < this.boardSize) {
        
        const occupiedBy = grid[nr][nc];
        const isStart = start && start.r === nr && start.c === nc;
        
        // Valid if: Empty OR (Occupied by self AND isStart)
        if (occupiedBy === -1 || (occupiedBy === idx && isStart)) {
           moves.push({ r: nr, c: nc });
        }
      }
    }
    return moves;
  }

  autoCompleteStep() {
    const current = this.currentPos();
    if (!current) return;

    const moves = this.getPossibleMoves(current);
    if (moves.length === 0) return;

    // Filter out "closing loop" unless it's the only choice
    const unvisitedMoves = moves.filter(m => this.boardState()[m.r][m.c] === -1);
    const candidates = unvisitedMoves.length > 0 ? unvisitedMoves : moves;

    // Warnsdorff's heuristic: pick move with fewest onward moves
    let bestMove = candidates[0];
    let minOnward = 9;

    const idx = this.activeKnight();

    for (const move of candidates) {
      // Lookahead: Simulate move to count onward moves
      // We simulate by adding to grid temporarily
      // Note: This is a simplified check that doesn't fully update the signal graph, which is fine for heuristic
      
      const onwardMoves = this.getOnwardMovesCount(move, idx);
      if (onwardMoves < minOnward) {
        minOnward = onwardMoves;
        bestMove = move;
      }
    }

    this.commitMove(bestMove.r, bestMove.c);
  }

  private getOnwardMovesCount(from: Position, myIdx: number): number {
    const offsets = [
      [-2, -1], [-2, 1], [-1, -2], [-1, 2],
      [1, -2], [1, 2], [2, -1], [2, 1]
    ];
    let count = 0;
    const grid = this.boardState();

    for (const [dr, dc] of offsets) {
      const nr = from.r + dr;
      const nc = from.c + dc;
      if (nr >= 0 && nr < this.boardSize && nc >= 0 && nc < this.boardSize) {
        // Here we just check if it's empty, we ignore self-loop closure for heuristic simplicity
        if (grid[nr][nc] === -1) {
          count++;
        }
      }
    }
    return count;
  }
}