import { Pipe, PipeTransform } from '@angular/core';

declare var marked: any;

@Pipe({
  name: 'markdown',
  standalone: true
})
export class MarkdownPipe implements PipeTransform {
  transform(value: string): string {
    if (!value) return '';
    try {
      return marked.parse(value);
    } catch (e) {
      console.error('Error parsing markdown:', e);
      return value;
    }
  }
}