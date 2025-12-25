import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameService, Position } from '../services/game.service';

@Component({
  selector: 'app-board',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative w-full max-w-[500px] aspect-square mx-auto select-none shadow-xl rounded-lg overflow-hidden border-4 border-slate-600 bg-black">
      
      <!-- HTML Grid for Clicks and Backgrounds -->
      <div class="grid grid-cols-8 grid-rows-8 w-full h-full absolute inset-0 z-0">
        @for (row of rows; track row) {
          @for (col of cols; track col) {
            <div 
              (click)="handleSquareClick(row, col)"
              role="button"
              [attr.aria-label]="getAriaLabel(row, col)"
              [attr.tabindex]="isInteractive(row, col) ? 0 : -1"
              (keydown.enter)="handleSquareClick(row, col)"
              (keydown.space)="handleSquareClick(row, col)"
              [class.cursor-pointer]="isInteractive(row, col)"
              [class.cursor-not-allowed]="!isInteractive(row, col) && game.currentPos()"
              class="w-full h-full flex items-center justify-center relative transition-colors duration-200 focus:z-10 focus:outline-none focus:ring-2 focus:ring-white focus:ring-inset"
              [style.background-color]="getSquareColor(row, col)"
            >
              <!-- Rank/File Labels (High Contrast) -->
              @if (col === 0) {
                 <span class="absolute left-1 top-0 text-[10px] font-bold" 
                       [style.color]="getLabelColor(row, col)">
                   {{ 8 - row }}
                 </span>
              }
              @if (row === 7) {
                 <span class="absolute right-1 bottom-0 text-[10px] font-bold"
                       [style.color]="getLabelColor(row, col)">
                   {{ getFileLabel(col) }}
                 </span>
              }

              <!-- Possible Move Indicator (Dot) -->
              @if (isPossibleMove(row, col)) {
                <div class="w-6 h-6 rounded-full border-2 border-white opacity-90 shadow-sm"
                     [style.background-color]="activeKnightColor()">
                </div>
              }
            </div>
          }
        }
      </div>

      <!-- SVG Overlay for Paths & Knights -->
      <svg viewBox="0 0 800 800" class="absolute inset-0 pointer-events-none w-full h-full z-10">
        
        <!-- Render Paths for all knights -->
        @for (pathData of renderedPaths(); track pathData.id) {
          @if (pathData.coords.length > 1) {
             <polyline 
               [attr.points]="pathData.points" 
               fill="none" 
               [attr.stroke]="pathData.color" 
               stroke-width="10" 
               stroke-linecap="round"
               stroke-linejoin="round"
               class="transition-all duration-300 drop-shadow-md"
             />
          }

          <!-- Start Marker -->
          @if (pathData.start) {
             <circle [attr.cx]="pathData.start.x" [attr.cy]="pathData.start.y" r="14" [attr.fill]="pathData.color" stroke="white" stroke-width="2" />
          }
        }

        <!-- Render Knight Icons on top -->
        @for (knight of activeKnights(); track knight.id) {
           <g [attr.transform]="'translate(' + (knight.pos.c * 100 + 50) + ',' + (knight.pos.r * 100 + 50) + ')'" 
              class="transition-transform duration-300 ease-out filter drop-shadow-xl">
             
             <!-- Highlight Ring for Active Knight -->
             @if (knight.isActive) {
               <circle r="42" fill="none" [attr.stroke]="knight.color" stroke-width="2.5" stroke-dasharray="6 4" class="animate-spin-slow opacity-80" />
             }

             <!-- Background Circle -->
             <circle r="36" 
                     [attr.fill]="knight.isClosed ? knight.color : '#f8fafc'" 
                     [attr.stroke]="knight.color" 
                     stroke-width="3" 
                     class="shadow-sm transition-colors duration-300" />
             
             <!-- Solid Icon Group (Matches Image) -->
             <g transform="translate(0, 4) scale(1.1)">
                @let sColor = knight.isClosed ? 'white' : '#1e293b';
                @let bColor = knight.isClosed ? knight.color : '#f8fafc';

                <!-- Base Block -->
                <path [attr.fill]="sColor" d="M-18 28 L18 28 L16 18 L-16 18 Z" />
                <!-- Base Groove (Cutout) -->
                <rect x="-14" y="23" width="28" height="2" [attr.fill]="bColor" rx="1" />

                <!-- Main Body (Head/Neck/Chest) -->
                <path [attr.fill]="sColor"
                      d="M -12 18
                         C -20 10, -22 -5, -22 -14
                         L -24 -18
                         L -22 -24
                         L -10 -28
                         L -4 -38
                         L 2 -30
                         C 4 -20, 4 -5, 2 18
                         Z" />

                <!-- Mane (Segmented/Separated) -->
                <path [attr.fill]="sColor"
                      d="M 6 -26
                         C 14 -15, 14 5, 8 18
                         L 14 18
                         C 22 5, 22 -15, 12 -30
                         Z" />
                         
                <!-- Eye Detail (Cutout) -->
                <circle cx="-12" cy="-22" r="1.5" [attr.fill]="bColor" />
             </g>
           </g>
        }
      </svg>
    </div>
  `
})
export class BoardComponent {
  game = inject(GameService);
  
  rows = [0, 1, 2, 3, 4, 5, 6, 7];
  cols = [0, 1, 2, 3, 4, 5, 6, 7];

  colors = ['#22d3ee', '#e879f9']; // Cyan, Fuchsia

  activeKnightColor = computed(() => this.colors[this.game.activeKnight()]);

  // Transform paths into renderable data
  renderedPaths = computed(() => {
    return this.game.paths().map((path, idx) => {
      const coords = path.map(p => ({ x: p.c * 100 + 50, y: p.r * 100 + 50 }));
      const points = coords.map(p => `${p.x},${p.y}`).join(' ');
      const start = coords.length > 0 ? coords[0] : null;
      
      return {
        id: idx,
        color: this.colors[idx],
        coords,
        points,
        start
      };
    });
  });

  // Transform current positions into renderable knights
  activeKnights = computed(() => {
    const knights = [];
    const paths = this.game.paths();
    const activeIdx = this.game.activeKnight();

    for (let i = 0; i < paths.length; i++) {
      const path = paths[i];
      if (path.length > 0) {
        const pos = path[path.length - 1];
        const isClosed = path.length > 2 && path[0].r === pos.r && path[0].c === pos.c;
        knights.push({
          id: i,
          pos,
          color: this.colors[i],
          isActive: i === activeIdx,
          isClosed
        });
      }
    }
    return knights;
  });

  possibleMoves = computed(() => {
    const curr = this.game.currentPos();
    if (!curr && this.game.paths()[this.game.activeKnight()].length > 0) return []; // Should catch empty path case usually handled in service
    
    // For first move (empty path), all empty squares are valid
    if (!curr) {
       const moves = [];
       const grid = this.game.boardState();
       for(let r=0; r<8; r++) {
         for(let c=0; c<8; c++) {
           if(grid[r][c] === -1) moves.push({r,c});
         }
       }
       return moves;
    }
    return this.game.getPossibleMoves(curr);
  });

  isPossibleMove(r: number, c: number): boolean {
    return this.possibleMoves().some(m => m.r === r && m.c === c);
  }

  isInteractive(r: number, c: number): boolean {
    // If active knight hasn't started, any empty square is valid
    if (!this.game.currentPos()) return this.game.boardState()[r][c] === -1;
    return this.isPossibleMove(r, c);
  }

  getSquareColor(r: number, c: number): string {
    const isDark = (r + c) % 2 === 1;
    const owner = this.game.boardState()[r][c];
    
    if (owner !== -1) {
      // Tint based on owner
      // Cyan Tint for 0, Fuchsia Tint for 1
      if (owner === 0) return isDark ? '#083344' : '#155e75'; // Dark Cyan variants
      if (owner === 1) return isDark ? '#4a044e' : '#701a75'; // Dark Fuchsia variants
    }
    // Unvisited squares
    return isDark ? '#475569' : '#e2e8f0'; 
  }

  getLabelColor(r: number, c: number): string {
    const isDark = (r + c) % 2 === 1;
    const owner = this.game.boardState()[r][c];

    if (owner !== -1) return '#cbd5e1'; // Light text on dark visited
    return isDark ? '#ffffff' : '#0f172a';
  }

  getFileLabel(col: number): string {
    return String.fromCharCode(65 + col);
  }

  getAriaLabel(r: number, c: number): string {
    const file = this.getFileLabel(c);
    const rank = 8 - r;
    const owner = this.game.boardState()[r][c];
    const status = owner === -1 ? 'unvisited' : `visited by Knight ${owner + 1}`;
    return `Square ${file}${rank}, ${status}`;
  }

  handleSquareClick(r: number, c: number) {
    this.game.moveKnight(r, c);
  }
}