import { Component, input, output, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  Question,
  QuestionType,
  TheoreticalQuestion,
  CodeSnippetQuestion,
  CodingTaskQuestion,
} from '../../../core/models/question.model';
import { QuestionService } from '../../../core/services/question.service';

@Component({
  selector: 'app-question-form',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './question-form.component.html',
  styleUrl: './question-form.component.scss',
})
export class QuestionFormComponent implements OnInit {
  question = input<Question | null>(null);

  save = output<Question>();
  cancel = output<void>();

  // Shared fields
  type = signal<QuestionType>('theoretical');
  title = signal('');
  points = signal(5);

  // Theoretical
  thFormat = signal<'mcq' | 'open-ended'>('mcq');
  thQuestion = signal('');
  thOptions = signal(['', '', '', '']);
  thCorrect = signal(0);

  // Code snippet
  csQuestion = signal('');
  csCode = signal('');
  csLanguage = signal('javascript');
  csOptions = signal(['', '', '', '']);
  csCorrect = signal(0);
  csExplanation = signal('');

  // Coding task
  ctDescription = signal('');
  ctStarterCode = signal('');
  ctLanguage = signal<'javascript' | 'typescript'>('javascript');
  ctHints = signal('');

  constructor(private questionService: QuestionService) {}

  ngOnInit(): void {
    const q = this.question();
    if (!q) return;

    this.type.set(q.type);
    this.title.set(q.title);
    this.points.set(q.points);

    if (q.type === 'theoretical') {
      this.thFormat.set(q.format);
      this.thQuestion.set(q.question);
      this.thOptions.set([...(q.options ?? ['', '', '', ''])]);
      this.thCorrect.set(q.correctAnswer ?? 0);
    } else if (q.type === 'code-snippet') {
      this.csQuestion.set(q.question);
      this.csCode.set(q.code);
      this.csLanguage.set(q.language);
      this.csOptions.set([...q.options]);
      this.csCorrect.set(q.correctAnswer);
      this.csExplanation.set(q.explanation ?? '');
    } else if (q.type === 'coding-task') {
      this.ctDescription.set(q.description);
      this.ctStarterCode.set(q.starterCode);
      this.ctLanguage.set(q.language);
      this.ctHints.set((q.hints ?? []).join('\n'));
    }
  }

  updateOption(list: string[], index: number, value: string): string[] {
    const copy = [...list];
    copy[index] = value;
    return copy;
  }

  onThOptionChange(index: number, value: string): void {
    this.thOptions.set(this.updateOption(this.thOptions(), index, value));
  }

  onCsOptionChange(index: number, value: string): void {
    this.csOptions.set(this.updateOption(this.csOptions(), index, value));
  }

  onSubmit(): void {
    const id = this.question()?.id ?? this.questionService.generateId();
    let built: Question;

    if (this.type() === 'theoretical') {
      built = {
        id, type: 'theoretical',
        title: this.title(),
        points: this.points(),
        format: this.thFormat(),
        question: this.thQuestion(),
        options: this.thFormat() === 'mcq' ? this.thOptions() : undefined,
        correctAnswer: this.thFormat() === 'mcq' ? this.thCorrect() : undefined,
      } as TheoreticalQuestion;
    } else if (this.type() === 'code-snippet') {
      built = {
        id, type: 'code-snippet',
        title: this.title(),
        points: this.points(),
        question: this.csQuestion(),
        code: this.csCode(),
        language: this.csLanguage(),
        options: this.csOptions(),
        correctAnswer: this.csCorrect(),
        explanation: this.csExplanation() || undefined,
      } as CodeSnippetQuestion;
    } else {
      built = {
        id, type: 'coding-task',
        title: this.title(),
        points: this.points(),
        description: this.ctDescription(),
        starterCode: this.ctStarterCode(),
        language: this.ctLanguage(),
        hints: this.ctHints()
          .split('\n')
          .map(h => h.trim())
          .filter(Boolean),
      } as CodingTaskQuestion;
    }

    this.save.emit(built);
  }

  onCancel(): void {
    this.cancel.emit();
  }
}
