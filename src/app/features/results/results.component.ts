import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { TestService } from '../../core/services/test.service';
import { TestResult, QuestionResult } from '../../core/models/question.model';

@Component({
  selector: 'app-results',
  standalone: true,
  templateUrl: './results.component.html',
  styleUrl: './results.component.scss',
})
export class ResultsComponent implements OnInit {
  result: TestResult | null = null;

  constructor(
    private testService: TestService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.result = this.testService.getResult();
    if (!this.result) {
      this.router.navigate(['/']);
    }
  }

  typeLabel(type: string): string {
    const map: Record<string, string> = {
      theoretical: 'Theoretical',
      'code-snippet': 'Code Snippet',
      'coding-task': 'Coding Task',
    };
    return map[type] ?? type;
  }

  isAutoGraded(qr: QuestionResult): boolean {
    return qr.question.type !== 'coding-task' &&
      !(qr.question.type === 'theoretical' && (qr.question as any).format === 'open-ended');
  }

  resultClass(qr: QuestionResult): string {
    if (!this.isAutoGraded(qr)) return 'manual';
    return qr.isCorrect ? 'correct' : 'incorrect';
  }

  getGrade(percentage: number): { label: string; cls: string } {
    if (percentage >= 90) return { label: 'Excellent', cls: 'grade-excellent' };
    if (percentage >= 75) return { label: 'Good', cls: 'grade-good' };
    if (percentage >= 50) return { label: 'Average', cls: 'grade-average' };
    return { label: 'Needs Work', cls: 'grade-poor' };
  }

  formatTime(date: Date | undefined): string {
    if (!date) return '—';
    return new Date(date).toLocaleTimeString();
  }

  retakeTest(): void {
    this.testService.clearSession();
    this.router.navigate(['/']);
  }
}
