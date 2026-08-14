import {
  Component,
  inject,
  signal,
  Input,
  Output,
  EventEmitter,
  OnDestroy,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, takeUntil } from 'rxjs/operators';
import { Patient } from '../../../patients/types/patients.types';
import { PatientsService } from '../../../patients/services/patients.service';

const SEARCH_DEBOUNCE_MS = 400;
const RESULTS_LIMIT = 15;

@Component({
  selector: 'app-link-patient-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './link-patient-modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LinkPatientModal implements OnDestroy {
  @Input() isOpen = false;
  @Output() close = new EventEmitter<void>();
  @Output() linked = new EventEmitter<Patient>();

  private patientsService = inject(PatientsService);
  private search$ = new Subject<string>();
  private destroy$ = new Subject<void>();

  searchTerm = signal('');
  results = signal<Patient[]>([]);
  isLoading = signal(false);
  selectedId = signal<number | null>(null);

  constructor() {
    this.search$
      .pipe(
        debounceTime(SEARCH_DEBOUNCE_MS),
        distinctUntilChanged(),
        switchMap((term) => {
          const trimmed = term.trim();
          if (!trimmed) {
            this.isLoading.set(false);
            return of({ data: [], total: 0 });
          }
          this.isLoading.set(true);
          return this.patientsService.getPatients({
            search: trimmed,
            skip: 0,
            take: RESULTS_LIMIT,
          });
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (res) => {
          this.results.set(res.data);
          this.isLoading.set(false);
        },
        error: () => this.isLoading.set(false),
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSearchChange(value: string): void {
    this.searchTerm.set(value);
    this.selectedId.set(null);
    if (!value.trim()) this.results.set([]);
    this.search$.next(value);
  }

  selectPatient(id: number): void {
    this.selectedId.set(id);
  }

  confirmLink(): void {
    const patient = this.results().find((p) => p.id === this.selectedId());
    if (!patient) return;
    this.linked.emit(patient);
    this.reset();
  }

  onClose(): void {
    this.reset();
    this.close.emit();
  }

  private reset(): void {
    this.searchTerm.set('');
    this.results.set([]);
    this.selectedId.set(null);
  }
}
