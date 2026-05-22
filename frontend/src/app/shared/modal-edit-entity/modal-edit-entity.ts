import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

export interface FormField {
  name: string;
  label: string;
  type: string;
  placeholder?: string;
  options?: string[];
  required?: boolean;
}

@Component({
  selector: 'app-modal-edit-entity',
  imports: [FormsModule],
  templateUrl: './modal-edit-entity.html',
  styles: ``,
})
export class ModalEditEntity {
  @Input() title: string = 'Editar';
  @Input() show: boolean = false;
  @Input() entity: any = {};
  @Input() fields: FormField[] = [];

  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<any>();

  showPassword = false;

  onClose() {
    this.close.emit();
  }

  onSave() {
    this.save.emit(this.entity);
  }
}