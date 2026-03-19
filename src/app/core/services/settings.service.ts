import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { API_BASE } from '../api';

export interface Settings {
  durationMinutes: number;
  requireCode: boolean;
  activeQuestionCount: number;
}

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private _durationMinutes = signal(60);
  private _requireCode = signal(false);
  private _activeQuestionCount = signal(0);
  readonly durationMinutes = this._durationMinutes.asReadonly();
  readonly requireCode = this._requireCode.asReadonly();
  readonly activeQuestionCount = this._activeQuestionCount.asReadonly();

  constructor(private http: HttpClient) {
    this.load().subscribe();
  }

  load(): Observable<Settings> {
    return this.http.get<Settings>(`${API_BASE}/api/settings`).pipe(
      tap(s => {
        this._durationMinutes.set(s.durationMinutes);
        this._requireCode.set(s.requireCode);
        if (s.activeQuestionCount !== undefined) this._activeQuestionCount.set(s.activeQuestionCount);
      })
    );
  }

  update(patch: Partial<Settings>): Observable<Settings> {
    return this.http.patch<Settings>(`${API_BASE}/api/settings`, patch).pipe(
      tap(s => {
        this._durationMinutes.set(s.durationMinutes);
        this._requireCode.set(s.requireCode);
        if (s.activeQuestionCount !== undefined) this._activeQuestionCount.set(s.activeQuestionCount);
      })
    );
  }
}
