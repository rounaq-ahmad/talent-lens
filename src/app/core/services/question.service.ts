import { Injectable, computed, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, tap, throwError } from 'rxjs';
import { Question } from '../models/question.model';
import { API_BASE } from '../api';

@Injectable({ providedIn: 'root' })
export class QuestionService {
  private _questions = signal<Question[]>([]);
  readonly questions = this._questions.asReadonly();
  readonly activeQuestions = computed(() => this._questions().filter(q => q.active !== false));

  constructor(private http: HttpClient) {
    this.load().subscribe();
  }

  load(): Observable<Question[]> {
    return this.http.get<Question[]>(`${API_BASE}/api/questions`).pipe(
      tap(qs => this._questions.set(qs))
    );
  }

  addQuestion(q: Question): Observable<Question> {
    return this.http.post<Question>(`${API_BASE}/api/questions`, q).pipe(
      tap(added => this._questions.update(qs => [...qs, added]))
    );
  }

  updateQuestion(q: Question): Observable<Question> {
    return this.http.put<Question>(`${API_BASE}/api/questions/${q.id}`, q).pipe(
      tap(updated => this._questions.update(qs => qs.map(x => x.id === updated.id ? updated : x)))
    );
  }

  deleteQuestion(id: string): Observable<void> {
    return this.http.delete<void>(`${API_BASE}/api/questions/${id}`).pipe(
      tap(() => this._questions.update(qs => qs.filter(q => q.id !== id)))
    );
  }

  setActive(id: string, active: boolean): Observable<Question> {
    // Optimistic update
    this._questions.update(qs => qs.map(q => q.id === id ? { ...q, active } : q));
    return this.http.patch<Question>(`${API_BASE}/api/questions/${id}/active`, { active }).pipe(
      tap(updated => this._questions.update(qs => qs.map(q => q.id === id ? updated : q))),
      catchError(err => {
        // Revert on failure
        this._questions.update(qs => qs.map(q => q.id === id ? { ...q, active: !active } : q));
        return throwError(() => err);
      })
    );
  }

  resetToSamples(): Observable<Question[]> {
    return this.http.post<Question[]>('/api/questions/reset', {}).pipe(
      tap(qs => this._questions.set(qs))
    );
  }

  generateId(): string {
    return `q_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  }
}
