import { Component, computed, signal, OnInit, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { TestService } from '../../core/services/test.service';
import { Question } from '../../core/models/question.model';
import { TimerComponent } from './components/timer/timer.component';
import { TheoreticalQuestionComponent } from './components/theoretical-question/theoretical-question.component';
import { CodeSnippetQuestionComponent } from './components/code-snippet-question/code-snippet-question.component';
import { CodingTaskComponent } from './components/coding-task/coding-task.component';

@Component({
  selector: 'app-test',
  standalone: true,
  imports: [
    TimerComponent,
    TheoreticalQuestionComponent,
    CodeSnippetQuestionComponent,
    CodingTaskComponent,
  ],
  templateUrl: './test.component.html',
  styleUrl: './test.component.scss',
})
export class TestComponent implements OnInit {
  currentIndex = signal(0);
  confirmSubmit = signal(false);
  timerInitialSeconds = signal<number | null>(null);

  constructor(
    public testService: TestService,
    private router: Router,
  ) {}

  async ngOnInit(): Promise<void> {
    if (this.testService.isActive()) {
      this.timerInitialSeconds.set(this.testService.getRemainingSeconds());
      return;
    }

    const { restored, index } = await this.testService.tryRestore();
    if (restored) {
      this.currentIndex.set(index);
      this.timerInitialSeconds.set(this.testService.getRemainingSeconds());
      return;
    }

    this.router.navigate(['/']);
  }

  goTo(index: number): void {
    this.currentIndex.set(index);
    this.testService.saveCurrentIndex(index);
  }

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.testService.isActive()) {
      event.preventDefault();
      event.returnValue = '';
    }
  }

  readonly questions = this.testService.questions;
  readonly session   = this.testService.session;

  readonly currentQuestion = computed<Question | null>(
    () => this.questions()[this.currentIndex()] ?? null,
  );

  readonly progress = computed(() => {
    const total = this.questions().length;
    if (total === 0) return 0;
    return Math.round(((this.currentIndex() + 1) / total) * 100);
  });

  readonly answeredCount = computed(() => {
    const answers = this.session()?.answers ?? {};
    return Object.keys(answers).length;
  });

  readonly currentAnswer = computed(() => {
    const q = this.currentQuestion();
    if (!q) return null;
    return this.testService.getAnswer(q.id)?.answer ?? null;
  });

  typeLabel(q: Question): string {
    const map: Record<string, string> = {
      theoretical: 'Theoretical',
      'code-snippet': 'Code Snippet',
      'coding-task': 'Coding Task',
    };
    return map[q.type] ?? q.type;
  }

  onAnswerChange(answer: string | number | null): void {
    const q = this.currentQuestion();
    if (q) this.testService.saveAnswer(q.id, answer);
  }

  prev(): void {
    if (this.currentIndex() > 0) this.goTo(this.currentIndex() - 1);
  }

  next(): void {
    if (this.currentIndex() < this.questions().length - 1)
      this.goTo(this.currentIndex() + 1);
  }

  requestSubmit(): void {
    this.confirmSubmit.set(true);
  }

  cancelSubmit(): void {
    this.confirmSubmit.set(false);
  }

  async submit(): Promise<void> {
    await this.testService.submitTest();
    this.router.navigate(['/submitted']);
  }

  onTimeUp(): void {
    this.submit();
  }
}
