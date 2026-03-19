import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { canDeactivateTest } from './core/guards/can-deactivate-test.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/home/home.component').then(m => m.HomeComponent),
  },
  {
    path: 'test',
    canDeactivate: [canDeactivateTest],
    loadComponent: () =>
      import('./features/test/test.component').then(m => m.TestComponent),
  },
  {
    path: 'submitted',
    loadComponent: () =>
      import('./features/submitted/submitted.component').then(m => m.SubmittedComponent),
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/login/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'admin',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/admin/admin.component').then(m => m.AdminComponent),
  },
  { path: '**', redirectTo: '' },
];
