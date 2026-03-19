import {
  Component,
  input,
  output,
  AfterViewInit,
  OnDestroy,
  ElementRef,
  viewChild,
  signal,
  effect,
} from '@angular/core';
import loader from '@monaco-editor/loader';
import { CodingTaskQuestion } from '../../../../core/models/question.model';
import { DescriptionHtmlPipe } from '../../../../core/pipes/description-html.pipe';
import type * as MonacoEditor from 'monaco-editor';

@Component({
  selector: 'app-coding-task',
  standalone: true,
  imports: [DescriptionHtmlPipe],
  templateUrl: './coding-task.component.html',
  styleUrl: './coding-task.component.scss',
})
export class CodingTaskComponent implements AfterViewInit, OnDestroy {
  question = input.required<CodingTaskQuestion>();
  answer = input<string | number | null>(null);

  answerChange = output<string>();

  editorContainer = viewChild<ElementRef<HTMLDivElement>>('editorContainer');
  showHints = signal(false);

  private editor: MonacoEditor.editor.IStandaloneCodeEditor | null = null;
  private suppressChange = false;

  constructor() {
    // Runs whenever the question input changes (i.e. navigating between coding tasks).
    // ngAfterViewInit only fires once, so without this the editor would keep showing
    // the first question's code for the entire session.
    effect(() => {
      const q = this.question();
      const ans = this.answer();
      if (!this.editor) return;

      const newValue = typeof ans === 'string' ? ans : q.starterCode;
      if (this.editor.getValue() !== newValue) {
        this.suppressChange = true;
        this.editor.setValue(newValue);
        this.suppressChange = false;
      }
    });
  }

  ngAfterViewInit(): void {
    loader.config({ paths: { vs: 'assets/monaco/vs' } });

    loader.init().then((monaco) => {
      const container = this.editorContainer()?.nativeElement;
      if (!container) return;

      const initialValue =
        typeof this.answer() === 'string'
          ? (this.answer() as string)
          : this.question().starterCode;

      this.editor = monaco.editor.create(container, {
        value: initialValue,
        language: this.question().language,
        theme: 'vs-dark',
        fontSize: 14,
        fontFamily: "'Fira Code', 'Cascadia Code', monospace",
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        lineNumbers: 'on',
        roundedSelection: true,
        automaticLayout: true,
        tabSize: 2,
        wordWrap: 'on',
      });

      this.editor.onDidChangeModelContent(() => {
        if (!this.suppressChange) {
          this.answerChange.emit(this.editor!.getValue());
        }
      });
    });
  }

  ngOnDestroy(): void {
    this.editor?.dispose();
  }

  toggleHints(): void {
    this.showHints.update(v => !v);
  }
}
