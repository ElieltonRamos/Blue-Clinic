import { Component, ElementRef, inject, signal, ViewChild } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ServiceLogin } from '../services/login.service';
import { LicenseService } from '../../../core/services/license.service';
import { NotificationService } from '../../../shared/toastr/notification.service';
import { alertLoading, closeLoading } from '../../../shared/alerts/custom-alerts';
import { version } from '../../../../../package.json';
import { ThemeService } from '../../../core/services/theme.service';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule],
  templateUrl: './login.html',
})
export class Login {
  @ViewChild('usernameInput') usernameInput!: ElementRef<HTMLInputElement>;
  private fb = inject(FormBuilder);
  private serviceLogin = inject(ServiceLogin);
  private router = inject(Router);
  private licenseService = inject(LicenseService);
  private notification = inject(NotificationService);
  themeService = inject(ThemeService);

  version = version;
  showPassword = signal(false);

  form = this.fb.group({
    username: ['', [Validators.required]],
    password: ['', [Validators.required, Validators.minLength(4)]],
  });

  ngOnInit() {
    localStorage.removeItem('token');
  }

  ngAfterViewInit() {
    this.usernameInput.nativeElement.focus();
  }

  togglePassword() {
    this.showPassword.update((v) => !v);
  }

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { username, password } = this.form.value;

    if (typeof username !== 'string' || typeof password !== 'string' || this.form.invalid) {
      return;
    }

    alertLoading();

    this.serviceLogin.login(username, password).subscribe({
      next: (response) => {
        localStorage.setItem('token', response.token);
        closeLoading();

        if (response.licenseWarning) {
          this.notification.warning(response.licenseWarning, 'Atenção');
        }

        this.licenseService.getTokenInfo().subscribe({
          next: (info) => {
            localStorage.setItem('licensePlan', info.plan);
          },
        });

        this.notification.success(`Bem Vindo! 👋`);
        this.form.reset();
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
          closeLoading();
        localStorage.removeItem('token');

        if (err.status === 0 || err.status === 500) {
          this.notification.error('Servidor indisponível');
        } else {
          this.notification.error(err.error?.message || 'Credenciais inválidas');
        }
        this.form.reset();
      },
    });
  }
}
