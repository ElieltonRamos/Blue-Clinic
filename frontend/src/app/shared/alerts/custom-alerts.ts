import Swal from 'sweetalert2';

export function alertError(msg: string) {
  Swal.fire({
    icon: 'error',
    title: 'Oops...',
    text: msg,
  });
}

export function alertLoading() {
  Swal.fire({
    title: 'Carregando...',
    allowOutsideClick: false,
    didOpen: () => {
      Swal.showLoading();
    },
  });
}

export function closeLoading() {
  Swal.close();
}

export function alertConfirm(title: string): Promise<boolean> {
  return Swal.fire({
    title: title,
    icon: 'warning',
    showCancelButton: true,
    cancelButtonText: 'Cancelar',
    confirmButtonColor: '#3085d6',
    cancelButtonColor: '#d33',
    confirmButtonText: 'Sim, Confirmar!',
  }).then((result) => {
    if (result.isConfirmed) {
      return true;
    } else {
      return false;
    }
  });
}

export function alertSuccess(msg: string) {
  Swal.fire({
    title: msg,
    icon: "success",
    draggable: true
  });
}

export function alertWarning(message: string): void {
  Swal.fire({
    icon: 'warning',
    title: 'Atenção',
    text: message,
    confirmButtonText: 'OK',
    confirmButtonColor: '#f39c12'
  });
}