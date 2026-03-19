import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { API_BASE } from '../api';

const TOKEN_KEY = 'interview_admin_token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private _isAuthenticated = signal<boolean>(!!sessionStorage.getItem(TOKEN_KEY));
  readonly isAuthenticated = this._isAuthenticated.asReadonly();

  constructor(private http: HttpClient) {}

  async login(password: string): Promise<boolean> {
    try {
      const { token } = await firstValueFrom(
        this.http.post<{ token: string }>(`${API_BASE}/api/auth/login`, { password })
      );
      sessionStorage.setItem(TOKEN_KEY, token);
      this._isAuthenticated.set(true);
      return true;
    } catch {
      return false;
    }
  }

  logout(): void {
    sessionStorage.removeItem(TOKEN_KEY);
    this._isAuthenticated.set(false);
  }
}
