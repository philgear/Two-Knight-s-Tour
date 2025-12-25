import { Injectable, signal } from '@angular/core';
import { GoogleGenAI } from "@google/genai";
import { Position } from './game.service';

@Injectable({
  providedIn: 'root'
})
export class GeminiService {
  private ai: GoogleGenAI;
  
  isAnalyzing = signal(false);
  analysisResult = signal<string>('');

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env['API_KEY'] });
  }

  async analyzePattern(paths: Position[][]) {
    const totalMoves = paths.reduce((acc, p) => acc + p.length, 0);

    if (totalMoves < 3) {
      this.analysisResult.set("Make a few moves first so I can see the pattern!");
      return;
    }

    this.isAnalyzing.set(true);
    this.analysisResult.set('');

    try {
      let descriptions = [];
      
      paths.forEach((path, index) => {
        if (path.length === 0) return;
        
        const isClosed = path.length > 2 && 
          path[0].r === path[path.length-1].r && 
          path[0].c === path[path.length-1].c;

        const algebraicPath = path.map(p => {
          const col = String.fromCharCode(65 + p.c);
          const row = 8 - p.r;
          return `${col}${row}`;
        }).join(' -> ');

        descriptions.push(`**Knight ${index + 1} Path:** ${algebraicPath} ${isClosed ? '(Closed Loop)' : ''}`);
      });

      const prompt = `
        I have created patterns on a chessboard using Knight's moves.
        
        ${descriptions.join('\n\n')}
        
        As an abstract art critic and pattern analyst, describe the geometry created.
        If there are two knights, analyze how their paths interact (do they mirror, avoid, or intertwine?).
        
        **Instructions:**
        1. Give the masterpiece a creative **Title**.
        2. Provide a **Visual Interpretation**.
        3. Use **Markdown** formatting (Bold for emphasis, bullet points).
        4. Keep it concise (max 100 words).
      `;

      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      this.analysisResult.set(response.text || "I couldn't analyze that pattern, but it looks interesting!");

    } catch (error) {
      console.error("Gemini Error:", error);
      this.analysisResult.set("My creative circuits are overloaded right now. Try again later.");
    } finally {
      this.isAnalyzing.set(false);
    }
  }

  async getChallenge(): Promise<string> {
    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: "Give me a short, fun challenge for a Knight's Tour on a chessboard. E.g., 'Start at A1 and end at H8'. Keep it under 20 words.",
      });
      return response.text?.trim() || "Start at a corner and touch all 4 center squares.";
    } catch (e) {
      return "Create a closed loop in the center.";
    }
  }
}