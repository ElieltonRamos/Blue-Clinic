import { Injectable, inject } from '@angular/core';
import { ToastrService, IndividualConfig } from 'ngx-toastr';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private toastr = inject(ToastrService);

  success(message: string, title = 'Sucesso!') {
    this.toastr.success(message, title, {
      timeOut: 1500,
      progressBar: true,
      closeButton: true,
      positionClass: 'toast-bottom-right',
      toastClass: 'blue-toast ngx-toastr'
    });
  }

  error(message: string, title = 'Erro!') {
    this.toastr.error(message, title, {
      timeOut: 6000,
      closeButton: true,
      progressAnimation: 'decreasing',
      positionClass: 'toast-bottom-right',
      toastClass: 'red-toast ngx-toastr'
    });
  }

  info(message: string, title = 'Informação') {
    this.toastr.info(message, title, {
      timeOut: 3000,
      progressBar: true,
      positionClass: 'toast-bottom-right',
      toastClass: 'info-toast ngx-toastr'
    });
  }

  warning(message: string, title = 'Atenção!') {
    this.toastr.warning(message, title, {
      timeOut: 4000,
      progressBar: true,
      closeButton: true,
      positionClass: 'toast-bottom-right',
      toastClass: 'yellow-toast ngx-toastr'
    });
  }

  loading(message: string, title = 'Carregando...') {
    this.toastr.info(message, title, {
      timeOut: 0,
      closeButton: true,
      progressBar: false,
      tapToDismiss: false,
      positionClass: 'toast-bottom-right',
      toastClass: 'loading-toast ngx-toastr'
    });
  }

  clear() {
    this.toastr.clear();
  }

  custom(type: 'success'|'error'|'info'|'warning', 
         message: string, 
         title?: string, 
         options?: IndividualConfig) {
    (this.toastr as any)[type](message, title, {
      positionClass: 'toast-bottom-right',
      ...options
    });
  }
}
