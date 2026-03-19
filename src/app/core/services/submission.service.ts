import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { TestResult } from '../models/question.model';
import { API_BASE } from '../api';

export interface Submission {
  id: string;
  candidateName: string;
  submittedAt: string;
  result: TestResult;
}

@Injectable({ providedIn: 'root' })
export class SubmissionService {
  private _submissions = signal<Submission[]>([]);
  readonly submissions = this._submissions.asReadonly();

  constructor(private http: HttpClient) {}

  load(): Observable<Submission[]> {
    return this.http.get<Submission[]>(`${API_BASE}/api/submissions`).pipe(
      tap(subs => this._submissions.set(subs))
    );
  }

  grade(id: string, grades: Record<string, number>): Observable<Submission> {
    return this.http.patch<Submission>(`${API_BASE}/api/submissions/${id}/grade`, { grades }).pipe(
      tap(updated => this._submissions.update(subs => subs.map(s => s.id === id ? updated : s)))
    );
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${API_BASE}/api/submissions/${id}`).pipe(
      tap(() => this._submissions.update(subs => subs.filter(s => s.id !== id)))
    );
  }
}
