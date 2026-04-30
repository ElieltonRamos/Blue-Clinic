import { Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { alertLoading, closeLoading } from '../../../shared/alerts/custom-alerts';
import { Router } from '@angular/router';
import { ServiceLogin } from '../services/login.service';
import { NotificationService } from '../../../shared/toastr/notification.service';
import { LicenseService } from '../../../core/services/license.service';
import { version } from '../../../../../package.json';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule],
  templateUrl: './login.html',
})
export class Login {
  version = version;
  private route = inject(Router);
  private loginService = inject(ServiceLogin);
  private notification = inject(NotificationService);
  private licenseService = inject(LicenseService);

  form = new FormGroup({
    username: new FormControl('', [Validators.required]),
    password: new FormControl('', [Validators.required]),
  });

  ngOnInit() {
    localStorage.removeItem('token');
  }

  onSubmit() {
    const { username, password } = this.form.value;

    if (typeof username !== 'string' || typeof password !== 'string' || this.form.invalid) {
      return;
    }

    alertLoading();

    this.loginService.login(username, password).subscribe({
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
        this.route.navigate(['/dashboard']);
      },
      error: (err) => {
        closeLoading();
        localStorage.removeItem('token');
        this.notification.error(err.error?.message || 'Credenciais inválidas');
        this.form.reset();
      },
    });
  }
}
