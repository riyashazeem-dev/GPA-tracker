import { inject } from '@angular/core';
import { Router, Routes } from '@angular/router';
import { isSupabaseConfigured } from './core/supabase/supabase.client';
import { authGuard } from './core/auth/auth.guard';
import { guestGuard } from './core/auth/guest.guard';
import { adminGuard } from './core/auth/admin.guard';
import { onboardingGuard } from './core/auth/onboarding.guard';
import { ShellComponent } from './core/layout/shell/shell.component';

export const routes: Routes = [
  {
    path: 'auth',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'auth/callback',
    loadComponent: () =>
      import('./features/auth/auth.callback.component').then((m) => m.AuthCallbackComponent),
  },
  {
    path: 'onboarding',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/auth/onboarding.component').then((m) => m.OnboardingComponent),
  },
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard, onboardingGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'curriculum',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
      {
        path: 'semesters',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
      {
        path: 'semesters/:semester',
        redirectTo: ({ params }) => inject(Router).createUrlTree(['/dashboard'], {
          queryParams: { semester: params['semester'] },
        }),
      },
      isSupabaseConfigured ? { path: 'gpa', redirectTo: 'dashboard', pathMatch: 'full' } : {
        path: 'gpa',
        loadComponent: () =>
          import('./features/gpa/gpa.component').then((m) => m.GpaComponent),
      },
      {
        path: 'gpa/history',
        loadComponent: () =>
          import('./features/gpa/gpa.component').then((m) => m.GpaComponent),
      },
      {
        path: 'electives',
        loadComponent: () =>
          import('./features/electives/electives.component').then((m) => m.ElectivesComponent),
      },
      {
        path: 'year-gpa',
        loadComponent: () =>
          import('./features/year-gpa/year-gpa.component').then((m) => m.YearGpaComponent),
      },
      {
        path: 'fgpa-predictor',
        loadComponent: () =>
          import('./features/fgpa-predictor/fgpa-predictor.component').then(
            (m) => m.FgpaPredictorComponent,
          ),
      },
      {
        path: 'predictions',
        loadComponent: () =>
          import('./features/predictions/predictions.component').then((m) => m.PredictionsComponent),
      },
      {
        path: 'target-planner',
        loadComponent: () =>
          import('./features/target-planner/target-planner.component').then(
            (m) => m.TargetPlannerComponent,
          ),
      },
      {
        path: 'progress',
        loadComponent: () =>
          import('./features/progress/progress.component').then((m) => m.ProgressComponent),
      },
      {
        path: 'ai-assistant',
        loadComponent: () =>
          import('./features/ai-assistant/ai-assistant.component').then(
            (m) => m.AiAssistantComponent,
          ),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./features/profile/profile.component').then((m) => m.ProfileComponent),
      },
      {
        path: 'admin',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/admin/admin.component').then((m) => m.AdminComponent),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
