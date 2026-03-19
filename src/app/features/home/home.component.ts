import { Component, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { QuestionService } from '../../core/services/question.service';
import { TestService } from '../../core/services/test.service';
import { SettingsService } from '../../core/services/settings.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent {
  candidateName = '';
  accessCode = '';
  nameError = signal(false);
  starting = signal(false);
  showConfirm = signal(false);
  startError = signal('');

  constructor(
    private router: Router,
    public questionService: QuestionService,
    private testService: TestService,
    public settingsService: SettingsService,
  ) {
    this.questionService.load().subscribe();
  }

  requestStart(): void {
    const requireCode = this.settingsService.requireCode();
    if (requireCode && !this.accessCode.trim()) {
      this.nameError.set(true);
      return;
    }
    if (!requireCode && !this.candidateName.trim()) {
      this.nameError.set(true);
      return;
    }
    this.nameError.set(false);
    this.showConfirm.set(true);
  }

  cancelStart(): void {
    this.showConfirm.set(false);
  }

  async confirmStart(): Promise<void> {
    this.starting.set(true);
    this.startError.set('');
    try {
      await this.testService.startTest(
        this.candidateName.trim(),
        this.settingsService.durationMinutes(),
        this.accessCode.trim() || undefined
      );
      this.router.navigate(['/test']);
    } catch (err: any) {
      this.startError.set(err.message);
      this.showConfirm.set(false);
    } finally {
      this.starting.set(false);
    }
  }
}
