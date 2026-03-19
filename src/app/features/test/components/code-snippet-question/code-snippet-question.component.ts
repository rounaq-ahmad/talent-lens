import {
  Component,
  input,
  output,
  ElementRef,
  viewChild,
  effect,
} from '@angular/core';
import { CodeSnippetQuestion } from '../../../../core/models/question.model';
import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';
import css from 'highlight.js/lib/languages/css';

hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('html', xml);
hljs.registerLanguage('css', css);

@Component({
  selector: 'app-code-snippet-question',
  standalone: true,
  templateUrl: './code-snippet-question.component.html',
  styleUrl: './code-snippet-question.component.scss',
})
export class CodeSnippetQuestionComponent {
  question = input.required<CodeSnippetQuestion>();
  answer = input<string | number | null>(null);

  answerChange = output<number>();

  codeBlock = viewChild<ElementRef<HTMLElement>>('codeBlock');

  constructor() {
    effect(() => {
      const q = this.question();
      // Defer so Angular has finished updating the DOM before we touch the element
      setTimeout(() => {
        const el = this.codeBlock()?.nativeElement;
        if (!el) return;
        el.removeAttribute('data-highlighted');
        el.textContent = q.code;
        el.className = `language-${q.language}`;
        hljs.highlightElement(el);
      }, 0);
    });
  }

  selectOption(index: number): void {
    this.answerChange.emit(index);
  }
}
