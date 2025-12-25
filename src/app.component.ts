import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BoardComponent } from './components/board.component';
import { GameService, Position } from './services/game.service';
import { GeminiService } from './services/gemini.service';
import { MarkdownPipe } from './pipes/markdown.pipe';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, BoardComponent, MarkdownPipe],
  template: `
    <main class="flex flex-col md:flex-row h-screen bg-[#121212] text-slate-100 font-sans">
      
      <!-- Left Panel: The Board -->
      <section class="flex-1 flex flex-col items-center justify-center p-4 relative overflow-hidden" aria-label="Game Board Area">
        
        <header class="mb-6 text-center z-10">
          <h1 class="text-4xl md:text-5xl font-extrabold text-white tracking-tight drop-shadow-sm">
            TWO KNIGHT'S TOUR
          </h1>
          <p class="text-base text-slate-400 mt-2 uppercase tracking-widest font-semibold">Pattern Explorer</p>
        </header>

        <!-- Knight Selection Controls -->
        <div class="mb-4 flex gap-4 z-10">
          @for (path of game.paths(); track $index) {
            <button 
              (click)="game.setActiveKnight($index)"
              [class.ring-2]="game.activeKnight() === $index"
              [class.ring-white]="game.activeKnight() === $index"
              class="px-4 py-2 rounded-full font-bold text-sm uppercase tracking-wider transition-all shadow-md flex items-center gap-2"
              [style.background-color]="getKnightColor($index)"
              [style.color]="'#000'"
            >
              Knight {{ $index + 1 }}
              @if (game.activeKnight() === $index) {
                <span class="w-2 h-2 rounded-full bg-black animate-pulse"></span>
              }
            </button>
          }
          @if (game.paths().length < 2) {
             <button 
               (click)="game.addKnight()"
               class="px-4 py-2 rounded-full bg-slate-800 border border-slate-600 hover:bg-slate-700 text-slate-300 font-bold text-sm uppercase tracking-wider transition-all"
             >
               + Add Knight
             </button>
          }
        </div>

        <div class="w-full max-w-[600px] z-10">
          <app-board></app-board>
        </div>

        <!-- Controls -->
        <div class="flex flex-wrap justify-center gap-4 mt-8 z-10" role="group" aria-label="Game Controls">
           <button 
             (click)="game.reset()" 
             class="px-8 py-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold transition-colors border-2 border-slate-600 focus:ring-4 focus:ring-slate-500 focus:outline-none shadow-lg">
             Reset Board
           </button>
           
           <button 
             (click)="game.undo()" 
             [disabled]="currentPathLength() === 0"
             class="px-8 py-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold transition-colors border-2 border-slate-600 disabled:opacity-50 disabled:cursor-not-allowed focus:ring-4 focus:ring-slate-500 focus:outline-none shadow-lg">
             Undo
           </button>

           <button 
             (click)="game.autoCompleteStep()" 
             [disabled]="!game.currentPos()"
             class="px-8 py-3 rounded-lg bg-blue-700 hover:bg-blue-600 text-white font-bold transition-colors border-2 border-blue-400 disabled:opacity-50 disabled:cursor-not-allowed focus:ring-4 focus:ring-blue-400 focus:outline-none shadow-lg">
             Auto Step
           </button>
        </div>
      </section>

      <!-- Right Panel: Info & AI -->
      <aside class="w-full md:w-[400px] bg-[#1a1a1a] border-l border-slate-700 p-8 flex flex-col gap-6 z-20 shadow-2xl overflow-y-auto" aria-label="Analysis and Statistics">
        
        <!-- Stats Card -->
        <div class="bg-slate-800 rounded-xl p-6 border border-slate-600 shadow-md shrink-0">
          <h2 class="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4 border-b border-slate-600 pb-2">Tour Statistics</h2>
          <div class="grid grid-cols-2 gap-6">
            <div>
              <div class="text-3xl font-mono font-bold text-white">{{ game.totalMoves() }}</div>
              <div class="text-sm text-slate-300 font-medium">Total Moves</div>
            </div>
            <div>
              <div class="text-3xl font-mono font-bold text-white">{{ 64 - game.totalMoves() }}</div>
              <div class="text-sm text-slate-300 font-medium">Remaining</div>
            </div>
          </div>
          
          <div class="mt-6 h-4 bg-slate-950 rounded-full overflow-hidden border border-slate-600" role="progressbar" [attr.aria-valuenow]="game.totalMoves()" aria-valuemin="0" aria-valuemax="64">
            <div 
              class="h-full bg-blue-500 transition-all duration-500"
              [style.width.%]="(game.totalMoves() / 64) * 100"
            ></div>
          </div>
        </div>

        <!-- Move History -->
        <div class="bg-slate-800 rounded-xl p-6 border border-slate-600 shadow-md flex flex-col max-h-[25vh] shrink-0">
           <h2 class="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4 border-b border-slate-600 pb-2">Move History</h2>
           <div class="flex gap-4 overflow-hidden h-full">
             <!-- Knight 1 -->
             <div class="flex-1 flex flex-col min-h-0">
               <div class="text-xs font-bold text-[#22d3ee] mb-2 sticky top-0 bg-slate-800 z-10 flex items-center gap-2">
                  <span class="w-2 h-2 rounded-full bg-[#22d3ee]"></span>
                  Knight 1
               </div>
               <div class="overflow-y-auto pr-2 space-y-1 h-full custom-scrollbar">
                 @for (pos of game.paths()[0]; track $index) {
                   <div class="text-xs font-mono text-slate-300 flex justify-between hover:bg-slate-700 px-2 py-0.5 rounded transition-colors">
                     <span class="opacity-50 w-6 text-right mr-2">{{ $index + 1 }}.</span>
                     <span class="font-bold flex-1 text-left">{{ toAlgebraic(pos) }}</span>
                   </div>
                 }
                 @if (game.paths()[0].length === 0) {
                   <div class="text-xs text-slate-500 italic px-2">No moves yet</div>
                 }
               </div>
             </div>
             
             <!-- Knight 2 -->
             @if (game.paths().length > 1) {
               <div class="w-px bg-slate-700 mx-1"></div>
               <div class="flex-1 flex flex-col min-h-0">
                 <div class="text-xs font-bold text-[#e879f9] mb-2 sticky top-0 bg-slate-800 z-10 flex items-center gap-2">
                  <span class="w-2 h-2 rounded-full bg-[#e879f9]"></span>
                  Knight 2
                 </div>
                 <div class="overflow-y-auto pr-2 space-y-1 h-full custom-scrollbar">
                   @for (pos of game.paths()[1]; track $index) {
                     <div class="text-xs font-mono text-slate-300 flex justify-between hover:bg-slate-700 px-2 py-0.5 rounded transition-colors">
                       <span class="opacity-50 w-6 text-right mr-2">{{ $index + 1 }}.</span>
                       <span class="font-bold flex-1 text-left">{{ toAlgebraic(pos) }}</span>
                     </div>
                   }
                   @if (game.paths()[1].length === 0) {
                     <div class="text-xs text-slate-500 italic px-2">No moves yet</div>
                   }
                 </div>
               </div>
             }
           </div>
        </div>

        <!-- AI Analyst -->
        <div class="flex-1 bg-slate-800 rounded-xl p-6 border border-slate-600 shadow-md flex flex-col min-h-[300px]">
          <h2 class="text-sm font-bold text-purple-300 uppercase tracking-wider mb-4 border-b border-slate-600 pb-2 flex items-center gap-2">
            <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
            Gemini Pattern Analyst
          </h2>

          <div class="flex-1 overflow-y-auto mb-6 pr-2" aria-live="polite">
            @if (gemini.analysisResult(); as result) {
              <div 
                class="p-4 bg-[#121212] rounded-lg border-l-4 border-purple-500 text-sm leading-relaxed text-slate-200 markdown-content"
                [innerHTML]="result | markdown"
              ></div>
            } @else {
              <p class="text-base text-slate-400 italic">
                Create a path on the board, then ask the AI to interpret your creation.
              </p>
            }
            
            @if (gemini.isAnalyzing()) {
              <div class="flex items-center gap-2 text-sm text-purple-300 font-bold animate-pulse mt-4" role="status">
                <div class="w-3 h-3 rounded-full bg-purple-400"></div>
                Analyzing geometric properties...
              </div>
            }
          </div>

          <div class="flex flex-col gap-3 shrink-0">
            <button 
              (click)="analyze()" 
              [disabled]="gemini.isAnalyzing() || game.totalMoves() < 3"
              class="w-full py-3 rounded-lg bg-purple-700 text-white font-bold text-base hover:bg-purple-600 transition-all shadow-md border-2 border-purple-400 focus:ring-4 focus:ring-purple-400 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed">
              Interpret Pattern
            </button>
            
            <button 
              (click)="getChallenge()"
              [disabled]="gemini.isAnalyzing()"
              class="w-full py-3 rounded-lg bg-slate-700 text-white font-bold text-sm hover:bg-slate-600 transition-all border-2 border-slate-500 focus:ring-4 focus:ring-slate-400 focus:outline-none">
              Get New Challenge
            </button>
          </div>
        </div>

        <!-- Instructions -->
        <div class="text-sm text-slate-400 text-center font-medium shrink-0">
          <p>Click highlighted squares to move the Active Knight.</p>
          <p>Knights cannot land on visited squares.</p>
        </div>

      </aside>
    </main>
  `
})
export class AppComponent {
  game = inject(GameService);
  gemini = inject(GeminiService);

  getKnightColor(index: number) {
    return index === 0 ? '#22d3ee' : '#e879f9';
  }

  currentPathLength() {
    return this.game.paths()[this.game.activeKnight()].length;
  }

  analyze() {
    this.gemini.analyzePattern(this.game.paths());
  }

  async getChallenge() {
    const challenge = await this.gemini.getChallenge();
    this.gemini.analysisResult.set(`**Challenge:** ${challenge}`);
    this.game.reset();
  }

  toAlgebraic(pos: Position): string {
    const file = String.fromCharCode(65 + pos.c);
    const rank = 8 - pos.r;
    return `${file}${rank}`;
  }
}