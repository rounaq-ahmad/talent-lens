import { Component, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TestService } from '../../core/services/test.service';

@Component({
  selector: 'app-submitted',
  standalone: true,
  templateUrl: './submitted.component.html',
  styleUrl: './submitted.component.scss',
})
export class SubmittedComponent implements OnInit {
  candidateName = signal('');
  answeredCount = signal(0);
  totalQuestions = signal(0);

  constructor(
    private testService: TestService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    const summary = this.testService.submitSummary();
    if (!summary) {
      this.router.navigate(['/']);
      return;
    }
    this.candidateName.set(summary.candidateName);
    this.answeredCount.set(summary.answeredCount);
    this.totalQuestions.set(summary.totalQuestions);
  }

  goHome(): void {
    this.router.navigate(['/']);
  }
}
