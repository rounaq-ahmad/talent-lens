import { Component, computed, signal } from '@angular/core';
import { Router } from '@angular/router';
import { QuestionService } from '../../core/services/question.service';
import { AuthService } from '../../core/services/auth.service';
import { SubmissionService, Submission } from '../../core/services/submission.service';
import { SettingsService } from '../../core/services/settings.service';
import { CandidateService } from '../../core/services/candidate.service';
import { Question, QuestionResult } from '../../core/models/question.model';
import { FormsModule } from '@angular/forms';
import { QuestionFormComponent } from './question-form/question-form.component';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [QuestionFormComponent, FormsModule],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.scss',
})
export class AdminComponent {
  activeTab = signal<'questions' | 'submissions' | 'candidates'>('questions');
  newCandidateName = '';
  editingQuestion = signal<Question | null>(null);
  showForm = signal(false);
  deleteConfirmId = signal<string | null>(null);
  expandedSubmissionId = signal<string | null>(null);
  deleteSubmissionId = signal<string | null>(null);
  pendingGrades = signal<Record<string, Record<string, number>>>({});
  savingGrades = signal<string | null>(null);

  durationInput = signal(60);
  savingDuration = signal(false);
  targetPointsInput = signal(100); // local only — not persisted

  searchQuestions   = signal('');
  searchSubmissions = signal('');

  filteredQuestions = computed(() => {
    const q = this.searchQuestions().toLowerCase().trim();
    if (!q) return this.questionService.questions();
    return this.questionService.questions().filter(
      x => x.title.toLowerCase().includes(q) || x.type.toLowerCase().includes(q)
    );
  });

  groupedQuestions = computed(() => {
    const qs = this.filteredQuestions();
    const groups = [
      { label: 'MCQ',          cls: 'group-mcq',          questions: qs.filter(q => q.type === 'theoretical' && (q as any).format === 'mcq') },
      { label: 'Open-ended',   cls: 'group-open-ended',   questions: qs.filter(q => q.type === 'theoretical' && (q as any).format === 'open-ended') },
      { label: 'Code Snippet', cls: 'group-code-snippet', questions: qs.filter(q => q.type === 'code-snippet') },
      { label: 'Coding Task',  cls: 'group-coding-task',  questions: qs.filter(q => q.type === 'coding-task') },
    ];
    return groups.filter(g => g.questions.length > 0);
  });

  filteredSubmissions = computed(() => {
    const q = this.searchSubmissions().toLowerCase().trim();
    if (!q) return this.submissionService.submissions();
    return this.submissionService.submissions().filter(
      s => s.candidateName.toLowerCase().includes(q)
    );
  });

  constructor(
    public questionService: QuestionService,
    public submissionService: SubmissionService,
    public settingsService: SettingsService,
    public candidateService: CandidateService,
    private authService: AuthService,
    private router: Router,
  ) {
    this.questionService.load().subscribe();
    this.settingsService.load().subscribe(s => this.durationInput.set(s.durationMinutes));
    this.candidateService.load().subscribe();
  }

  setTab(tab: 'questions' | 'submissions' | 'candidates'): void {
    this.activeTab.set(tab);
    if (tab === 'submissions') this.submissionService.load().subscribe();
    if (tab === 'candidates') this.candidateService.load().subscribe();
  }

  addCandidate(): void {
    if (!this.newCandidateName.trim()) return;
    this.candidateService.add(this.newCandidateName.trim()).subscribe();
    this.newCandidateName = '';
  }

  removeCandidate(id: string): void {
    this.candidateService.remove(id).subscribe();
  }

  copyCode(code: string): void {
    navigator.clipboard.writeText(code);
  }

  // ── Questions ────────────────────────────────────────────────────────────────

  addNew(): void {
    this.editingQuestion.set(null);
    this.showForm.set(true);
  }

  editQuestion(q: Question): void {
    this.editingQuestion.set(q);
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
    this.editingQuestion.set(null);
  }

  onFormSave(q: Question): void {
    const op = this.editingQuestion()
      ? this.questionService.updateQuestion(q)
      : this.questionService.addQuestion(q);
    op.subscribe(() => this.closeForm());
  }

  confirmDelete(id: string): void {
    this.deleteConfirmId.set(id);
  }

  cancelDelete(): void {
    this.deleteConfirmId.set(null);
  }

  doDelete(): void {
    const id = this.deleteConfirmId();
    if (id) this.questionService.deleteQuestion(id).subscribe();
    this.deleteConfirmId.set(null);
  }

  resetToSamples(): void {
    this.questionService.resetToSamples().subscribe();
  }

  typeLabel(type: string): string {
    const map: Record<string, string> = {
      theoretical: 'Theoretical',
      'code-snippet': 'Code Snippet',
      'coding-task': 'Coding Task',
    };
    return map[type] ?? type;
  }

  countType(type: string): number {
    return this.questionService.questions().filter(q => q.type === type).length;
  }

  totalPoints(): number {
    return this.questionService.questions().reduce((sum, q) => sum + q.points, 0);
  }

  // ── Submissions ──────────────────────────────────────────────────────────────

  toggleSubmission(id: string): void {
    this.expandedSubmissionId.set(this.expandedSubmissionId() === id ? null : id);
  }

  confirmDeleteSubmission(id: string): void {
    this.deleteSubmissionId.set(id);
  }

  cancelDeleteSubmission(): void {
    this.deleteSubmissionId.set(null);
  }

  doDeleteSubmission(): void {
    const id = this.deleteSubmissionId();
    if (id) {
      this.submissionService.delete(id).subscribe(() => {
        if (this.expandedSubmissionId() === id) this.expandedSubmissionId.set(null);
      });
    }
    this.deleteSubmissionId.set(null);
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

  formatDate(value: string | Date): string {
    return new Date(value).toLocaleString();
  }

  exportToCsv(): void {
    const rows = [
      ['Name', 'Submitted At', 'Auto Score', 'Max Score', 'Percentage', 'Questions Answered'],
      ...this.submissionService.submissions().map(s => [
        s.candidateName,
        new Date(s.submittedAt).toLocaleString(),
        s.result.totalScore,
        s.result.maxScore,
        `${s.result.percentage}%`,
        Object.keys(s.result.session.answers).length,
      ]),
    ];
    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `submissions_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }

  activeQuestionCount = computed(() =>
    this.questionService.questions().filter(q => q.active !== false).length
  );

  toggleActive(q: Question, active: boolean): void {
    this.questionService.setActive(q.id, active).subscribe();
  }

  // ── Auto-select ──────────────────────────────────────────────────────────────

  autoSelect(): void {
    const all = this.questionService.questions();
    if (!all.length) return;

    const shuffle = <T>(arr: T[]): T[] => [...arr].sort(() => Math.random() - 0.5);

    const groups = [
      all.filter(q => q.type === 'theoretical' && (q as any).format === 'mcq'),
      all.filter(q => q.type === 'theoretical' && (q as any).format === 'open-ended'),
      all.filter(q => q.type === 'code-snippet'),
      all.filter(q => q.type === 'coding-task'),
    ].filter(g => g.length > 0).map(shuffle);

    const selected = new Set<string>();
    let total = 0;
    const TARGET = this.targetPointsInput();

    // First pass: one from each group to ensure coverage
    for (const group of groups) {
      const q = group[0];
      if (total + q.points <= TARGET) {
        selected.add(q.id);
        total += q.points;
      }
    }

    // Second pass: fill remaining budget randomly from all unused questions
    const remaining = shuffle(groups.flat().filter(q => !selected.has(q.id)));
    for (const q of remaining) {
      if (total + q.points <= TARGET) {
        selected.add(q.id);
        total += q.points;
      }
    }

    // Apply changes — only send requests for questions whose state actually changes
    all.forEach(q => {
      const shouldBeActive = selected.has(q.id);
      if ((q.active !== false) !== shouldBeActive) {
        this.questionService.setActive(q.id, shouldBeActive).subscribe();
      }
    });
  }

  // ── Settings ─────────────────────────────────────────────────────────────────

  saveDuration(): void {
    const val = this.durationInput();
    if (val < 1) return;
    this.savingDuration.set(true);
    this.settingsService.update({ durationMinutes: val }).subscribe(() => this.savingDuration.set(false));
  }

  // ── Manual Grading ───────────────────────────────────────────────────────────

  hasManualQuestions(sub: Submission): boolean {
    return sub.result.questionResults.some(qr => !this.isAutoGraded(qr));
  }

  getPendingGrade(subId: string, questionId: string, currentScore: number): number {
    return this.pendingGrades()[subId]?.[questionId] ?? currentScore;
  }

  setPendingGrade(subId: string, questionId: string, raw: string, maxPts: number): void {
    const score = Math.max(0, Math.min(maxPts, Number(raw) || 0));
    this.pendingGrades.update(pg => ({
      ...pg,
      [subId]: { ...(pg[subId] ?? {}), [questionId]: score },
    }));
  }

  hasPendingGrades(subId: string): boolean {
    return Object.keys(this.pendingGrades()[subId] ?? {}).length > 0;
  }

  saveGrades(subId: string): void {
    const grades = this.pendingGrades()[subId];
    if (!grades) return;
    this.savingGrades.set(subId);
    this.submissionService.grade(subId, grades).subscribe(() => {
      this.pendingGrades.update(pg => {
        const { [subId]: _, ...rest } = pg;
        return rest;
      });
      this.savingGrades.set(null);
    });
  }

  // ── Auth ─────────────────────────────────────────────────────────────────────

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  goHome(): void {
    this.router.navigate(['/']);
  }
}
