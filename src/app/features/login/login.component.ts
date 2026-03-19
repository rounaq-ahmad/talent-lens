import { Component, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  password = '';
  showPassword = signal(false);
  error = signal(false);
  loading = signal(false);

  constructor(private auth: AuthService, private router: Router) {
    if (this.auth.isAuthenticated()) {
      this.router.navigate(['/admin']);
    }
  }

  async submit(): Promise<void> {
    this.loading.set(true);
    this.error.set(false);
    if (await this.auth.login(this.password)) {
      this.router.navigate(['/admin']);
    } else {
      this.error.set(true);
      this.password = '';
      this.loading.set(false);
    }
  }

  togglePassword(): void {
    this.showPassword.update(v => !v);
  }

  clearError(): void {
    this.error.set(false);
  }

  goHome(): void {
    this.router.navigate(['/']);
  }
}
