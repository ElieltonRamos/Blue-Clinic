import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-paginator',
  imports: [],
  templateUrl: './paginator.component.html',
})
export class PaginatorComponent {
  @Input() page: number = 1;
  @Input() totalItems: number = 0;
  @Input() itemsPerPage: number = 10;
  @Input() totalPages: number = 0;

  @Output() pageChanged = new EventEmitter<number>();

  changePage(page: number) {
    this.pageChanged.emit(page);
  }

  pages(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }
}
