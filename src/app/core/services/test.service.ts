import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { TestSession, CandidateAnswer, Question } from '../models/question.model';
import { API_BASE } from '../api';

const SESSION_TOKEN_KEY = 'interview_session_token';
const INDEX_KEY         = 'interview_test_index';

export interface SubmitSummary {
  candidateName: string;
  answeredCount: number;
  totalQuestions: number;
}

@Injectable({ providedIn: 'root' })
export class TestService {
  private _session   = signal<TestSession | null>(null);
  private _questions = signal<Question[]>([]);
  private _submitSummary = signal<SubmitSummary | null>(null);

  readonly session       = this._session.asReadonly();
  readonly questions     = this._questions.asReadonly();
  readonly submitSummary = this._submitSummary.asReadonly();

  readonly isActive = computed(() => {
    const s = this._session();
    return s !== null && !s.completed;
  });

  // Debounce handle for answer saves
  private saveTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(private http: HttpClient) {}

  async startTest(candidateName: string, durationMinutes: number, code?: string): Promise<void> {
    let data: { sessionToken: string; candidateName: string; startTime: string; durationMinutes: number; questions: Question[] };
    try {
      data = await firstValueFrom(
        this.http.post<typeof data>(`${API_BASE}/api/test/start`, { candidateName, durationMinutes, code })
      );
    } catch (err: any) {
      throw new Error(err?.error?.error ?? 'Failed to start the test. Please try again.');
    }
    sessionStorage.setItem(SESSION_TOKEN_KEY, data.sessionToken);
    this._questions.set(data.questions);
    this._session.set({
      candidateName: data.candidateName,
      startTime: new Date(data.startTime),
      answers: {},
      durationMinutes: data.durationMinutes,
      completed: false,
    });
  }

  /** Update local signal immediately; debounce the API call by 800ms. */
  saveAnswer(questionId: string, answer: string | number | null): void {
    const s = this._session();
    if (!s || s.completed) return;
    this._session.set({ ...s, answers: { ...s.answers, [questionId]: { questionId, answer } } });

    if (this.saveTimeout) clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => {
      this.http.post(`${API_BASE}/api/test/answer`, { questionId, answer }).subscribe();
      this.saveTimeout = null;
    }, 800);
  }

  saveCurrentIndex(index: number): void {
    sessionStorage.setItem(INDEX_KEY, String(index));
  }

  getAnswer(questionId: string): CandidateAnswer | null {
    return this._session()?.answers[questionId] ?? null;
  }

  getRemainingSeconds(): number {
    const s = this._session();
    if (!s) return 0;
    const elapsed = Math.floor((Date.now() - new Date(s.startTime).getTime()) / 1000);
    return Math.max(0, s.durationMinutes * 60 - elapsed);
  }

  async tryRestore(): Promise<{ restored: boolean; index: number }> {
    const token = sessionStorage.getItem(SESSION_TOKEN_KEY);
    if (!token) return { restored: false, index: 0 };

    try {
      const data = await firstValueFrom(
        this.http.get<{
          candidateName: string;
          startTime: string;
          durationMinutes: number;
          answers: Record<string, CandidateAnswer>;
          questions: Question[];
        }>(`${API_BASE}/api/test/session`)
      );

      // Discard if time already ran out
      const elapsed = Math.floor((Date.now() - new Date(data.startTime).getTime()) / 1000);
      if (elapsed >= data.durationMinutes * 60) {
        this.clearSession();
        return { restored: false, index: 0 };
      }

      this._questions.set(data.questions);
      this._session.set({
        candidateName: data.candidateName,
        startTime: new Date(data.startTime),
        answers: data.answers,
        durationMinutes: data.durationMinutes,
        completed: false,
      });

      const index = parseInt(sessionStorage.getItem(INDEX_KEY) ?? '0', 10);
      return { restored: true, index: isNaN(index) ? 0 : index };
    } catch {
      return { restored: false, index: 0 };
    }
  }

  async submitTest(): Promise<SubmitSummary | null> {
    // Flush any pending answer save immediately
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
    try {
      const summary = await firstValueFrom(
        this.http.post<SubmitSummary>(`${API_BASE}/api/test/submit`, {})
      );
      const s = this._session();
      this._session.set(s ? { ...s, completed: true, endTime: new Date() } : null);
      this._submitSummary.set(summary);
      this.clearSession();
      return summary;
    } catch {
      return null;
    }
  }

  clearSession(): void {
    this._session.set(null);
    this._questions.set([]);
    sessionStorage.removeItem(SESSION_TOKEN_KEY);
    sessionStorage.removeItem(INDEX_KEY);
  }
}
