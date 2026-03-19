import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { API_BASE } from '../api';

export interface Candidate {
  id: string;
  name: string;
  code: string;
  completed: boolean;
}

@Injectable({ providedIn: 'root' })
export class CandidateService {
  private _candidates = signal<Candidate[]>([]);
  readonly candidates = this._candidates.asReadonly();

  constructor(private http: HttpClient) {}

  load(): Observable<Candidate[]> {
    return this.http.get<Candidate[]>(`${API_BASE}/api/candidates`).pipe(
      tap(c => this._candidates.set(c))
    );
  }

  add(name: string): Observable<Candidate> {
    return this.http.post<Candidate>(`${API_BASE}/api/candidates`, { name }).pipe(
      tap(c => this._candidates.update(list => [...list, c]))
    );
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${API_BASE}/api/candidates/${id}`).pipe(
      tap(() => this._candidates.update(list => list.filter(c => c.id !== id)))
    );
  }
}
