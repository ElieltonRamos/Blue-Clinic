import {
  Component,
  EventEmitter,
  Input,
  Output,
  inject,
  ViewChild,
  AfterViewInit,
  OnDestroy,
  OnChanges,
  SimpleChanges,
  ChangeDetectorRef,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Overlay, OverlayConfig, OverlayRef } from '@angular/cdk/overlay';
import { CdkPortal, PortalModule } from '@angular/cdk/portal';
import { Subject, debounceTime, distinctUntilChanged, switchMap, of } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { CreateAppointmentService } from '../services/create-appointment.service';
import {
  AppointmentType,
  DoctorSummary,
  ModalStep,
  PatientSummary,
  Slot,
  CreateAppointmentRequest,
  AppointmentResponse,
} from '../types/create-appointment.types';
import { NotificationService } from '../../toastr/notification.service';

@Component({
  selector: 'app-create-appointment-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, PortalModule],
  templateUrl: './create-appointment-modal.html',
})
export class CreateAppointmentModal implements AfterViewInit, OnDestroy, OnChanges {
  private readonly service = inject(CreateAppointmentService);
  private readonly notification = inject(NotificationService);
  private readonly overlay = inject(Overlay);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroy$ = new Subject<void>();
  private readonly doctorSearch$ = new Subject<string>();
  private readonly patientSearch$ = new Subject<string>();

  @Input() prefillPatientId: number | null = null;
  @Input() isOpen = false;
  @Output() close = new EventEmitter<void>();
  @Output() appointmentCreated = new EventEmitter<AppointmentResponse>();

  @ViewChild(CdkPortal) portal!: CdkPortal;

  private overlayRef: OverlayRef | null = null;

  private readonly overlayConfig = new OverlayConfig({
    hasBackdrop: true,
    backdropClass: 'modal-backdrop-dark',
    panelClass: 'modal-panel',
    positionStrategy: this.overlay.position().global().centerHorizontally().centerVertically(),
    scrollStrategy: this.overlay.scrollStrategies.block(),
    maxWidth: '90vw',
    maxHeight: '90vh',
  });

  // ── Steps ─────────────────────────────────────────────────────────────────
  get steps(): ModalStep[] {
    return this.prefillPatientId
      ? ['doctor', 'type', 'date', 'slot', 'confirm']
      : ['doctor', 'type', 'date', 'slot', 'patient', 'confirm'];
  }

  currentStep = signal<ModalStep>('doctor');

  readonly stepIndex = computed(() => this.steps.indexOf(this.currentStep()));
  readonly stepLabels: Record<ModalStep, string> = {
    doctor: 'Médico',
    type: 'Tipo',
    date: 'Data',
    slot: 'Horário',
    patient: 'Paciente',
    confirm: 'Confirmar',
  };

  // ── Doctors ───────────────────────────────────────────────────────────────
  doctors: DoctorSummary[] = [];
  doctorSearchQuery = '';
  loadingDoctors = false;
  selectedDoctor: DoctorSummary | null = null;

  // ── Appointment Types ─────────────────────────────────────────────────────
  appointmentTypes: AppointmentType[] = [];
  loadingTypes = false;
  selectedType: AppointmentType | null = null;

  // ── Date ──────────────────────────────────────────────────────────────────
  selectedDate = '';
  readonly minDate = new Date().toISOString().split('T')[0];

  // ── Slots ─────────────────────────────────────────────────────────────────
  slots: Slot[] = [];
  loadingSlots = false;
  selectedSlot: Slot | null = null;

  // ── Patients ──────────────────────────────────────────────────────────────
  patients: PatientSummary[] = [];
  patientSearchQuery = '';
  loadingPatients = false;
  selectedPatient: PatientSummary | null = null;

  // ── Extras ────────────────────────────────────────────────────────────────
  notes = '';
  responsible = '';
  isSaving = false;

  // ── Computed helpers ──────────────────────────────────────────────────────
  get availableSlots(): Slot[] {
    return this.slots.filter((s) => s.status === 'available');
  }

  get unavailableSlots(): Slot[] {
    return this.slots.filter((s) => s.status !== 'available');
  }

  get canGoNext(): boolean {
    switch (this.currentStep()) {
      case 'doctor':
        return !!this.selectedDoctor;
      case 'type':
        return !!this.selectedType;
      case 'date':
        return !!this.selectedDate && this.isValidDay();
      case 'slot':
        return !!this.selectedSlot;
      case 'patient':
        return !!this.selectedPatient;
      case 'confirm':
        return true;
    }
  }

  get formattedDate(): string {
    if (!this.selectedDate) return '';
    const [y, m, d] = this.selectedDate.split('-');
    return new Date(+y, +m - 1, +d).toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  ngAfterViewInit(): void {
    if (this.isOpen) this.openModal();
    this.setupDoctorSearch();
    this.setupPatientSearch();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen']) {
      if (this.isOpen && this.portal) {
        this.openModal();
        this.reset();
        if (this.prefillPatientId) {
          this.loadPatientById(this.prefillPatientId);
        }
        this.loadDoctors();
        this.loadTypes();
      } else if (!this.isOpen) {
        this.closeModalInternal();
      }
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.closeModalInternal();
  }

  // ── Modal control ─────────────────────────────────────────────────────────
  private openModal(): void {
    if (!this.overlayRef) {
      this.overlayRef = this.overlay.create(this.overlayConfig);
      this.overlayRef.backdropClick().subscribe(() => this.closeModal());
      this.overlayRef.keydownEvents().subscribe((e) => {
        if (e.key === 'Escape') this.closeModal();
      });
    }
    if (this.portal && !this.overlayRef.hasAttached()) {
      this.overlayRef.attach(this.portal);
    }
  }

  private closeModalInternal(): void {
    if (this.overlayRef) {
      this.overlayRef.detach();
      this.overlayRef.dispose();
      this.overlayRef = null;
    }
  }

  private loadPatientById(id: number): void {
    this.service.getPatientById(id).subscribe({
      next: (patient) => {
        this.selectedPatient = patient;
        this.patientSearchQuery = patient.name;
        this.currentStep.set('doctor');
        this.cdr.detectChanges();
      },
      error: () => this.notification.error('Erro ao carregar paciente'),
    });
  }

  closeModal(): void {
    this.close.emit();
  }

  onModalClick(event: MouseEvent): void {
    event.stopPropagation();
  }

  // ── Navigation ────────────────────────────────────────────────────────────
  goNext(): void {
    const idx = this.stepIndex();
    if (idx < this.steps.length - 1) {
      const next = this.steps[idx + 1];
      this.currentStep.set(next);
      if (next === 'slot') this.loadSlots();
    }
  }

  goBack(): void {
    const idx = this.stepIndex();
    if (idx > 0) this.currentStep.set(this.steps[idx - 1]);
  }

  goToStep(step: ModalStep): void {
    const targetIdx = this.steps.indexOf(step);
    if (targetIdx <= this.stepIndex()) this.currentStep.set(step);
  }

  // ── Data loading ──────────────────────────────────────────────────────────
  private loadDoctors(search?: string): void {
    this.loadingDoctors = true;
    this.service.getDoctors(search).subscribe({
      next: (doctors) => {
        this.doctors = doctors;
        this.loadingDoctors = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loadingDoctors = false;
        this.notification.error('Erro ao carregar médicos');
        this.cdr.detectChanges();
      },
    });
  }

  private loadTypes(): void {
    this.loadingTypes = true;
    this.service.getAppointmentTypes().subscribe({
      next: (types) => {
        this.appointmentTypes = types;
        this.loadingTypes = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loadingTypes = false;
        this.notification.error('Erro ao carregar tipos de consulta');
        this.cdr.detectChanges();
      },
    });
  }

  private loadSlots(): void {
    console.log(
      'loadSlots chamado',
      this.selectedDoctor?.id,
      this.selectedDate,
      this.selectedType?.id,
    );
    if (!this.selectedDoctor || !this.selectedDate || !this.selectedType) return;
    this.loadingSlots = true;
    this.slots = [];
    this.selectedSlot = null;

    this.service
      .getSlots(this.selectedDoctor.id, this.selectedDate, this.selectedType.id)
      .subscribe({
        next: (slots) => {
          console.log('slots recebidos:', JSON.stringify(slots));
          this.slots = slots;
          this.loadingSlots = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.loadingSlots = false;
          const msg = err?.error?.message || 'Erro ao carregar horários';
          this.notification.error(msg);
          this.cdr.detectChanges();
        },
      });
  }

  // ── Search setup ──────────────────────────────────────────────────────────
  private setupDoctorSearch(): void {
    this.doctorSearch$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((query) => this.loadDoctors(query || undefined));
  }

  private setupPatientSearch(): void {
    this.patientSearch$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((query) => {
          if (!query || query.length < 2) return of({ data: [], total: 0 });
          this.loadingPatients = true;
          return this.service.searchPatients(query);
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (res) => {
          this.patients = res.data;
          this.loadingPatients = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.loadingPatients = false;
          this.cdr.detectChanges();
        },
      });
  }

  onDoctorSearchChange(): void {
    this.doctorSearch$.next(this.doctorSearchQuery);
  }

  onPatientSearchChange(): void {
    this.patientSearch$.next(this.patientSearchQuery);
  }

  // ── Selection ─────────────────────────────────────────────────────────────
  selectDoctor(doctor: DoctorSummary): void {
    this.selectedDoctor = doctor;
    // reset downstream
    this.selectedSlot = null;
    this.slots = [];
  }

  selectType(type: AppointmentType): void {
    this.selectedType = type;
    this.selectedSlot = null;
    this.slots = [];
  }

  selectSlot(slot: Slot): void {
    if (slot.status !== 'available') return;
    this.selectedSlot = slot;
  }

  selectPatient(patient: PatientSummary): void {
    this.selectedPatient = patient;
    this.patientSearchQuery = patient.name;
    this.patients = [];
  }

  // ── Date validation ───────────────────────────────────────────────────────
  isValidDay(): boolean {
    if (!this.selectedDoctor || !this.selectedDate) return false;
    const [y, m, d] = this.selectedDate.split('-').map(Number);
    const dow = new Date(y, m - 1, d).getDay();
    return this.selectedDoctor.schedules.some((s) => s.dayOfWeek === dow && s.active);
  }

  get invalidDayMessage(): string {
    if (!this.selectedDoctor || !this.selectedDate) return '';
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const activeDays = this.selectedDoctor.schedules
      .filter((s) => s.active)
      .map((s) => days[s.dayOfWeek])
      .join(', ');
    return `Médico atende apenas: ${activeDays}`;
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  confirm(): void {
    if (!this.selectedDoctor || !this.selectedPatient || !this.selectedType || !this.selectedSlot)
      return;

    this.isSaving = true;

    const dto: CreateAppointmentRequest = {
      doctorId: this.selectedDoctor.id,
      patientId: this.selectedPatient.id,
      appointmentTypeId: this.selectedType.id,
      specialty: this.selectedDoctor.specialty,
      date: this.selectedDate,
      startTime: this.selectedSlot.startTime,
      endTime: this.selectedSlot.endTime,
      notes: this.notes || undefined,
      responsible: this.responsible || undefined,
    };

    this.service.createAppointment(dto).subscribe({
      next: (appointment) => {
        this.isSaving = false;
        this.notification.success('Agendamento criado com sucesso');
        this.appointmentCreated.emit(appointment);
        this.closeModal();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isSaving = false;
        const msg = err?.error?.message || 'Erro ao criar agendamento';
        this.notification.error(msg);
        this.cdr.detectChanges();
      },
    });
  }

  // ── Reset ─────────────────────────────────────────────────────────────────
  private reset(): void {
    this.currentStep.set('doctor');
    this.selectedDoctor = null;
    this.selectedType = null;
    this.selectedDate = '';
    this.selectedSlot = null;
    if (!this.prefillPatientId) {
      this.selectedPatient = null;
      this.patientSearchQuery = '';
      this.patients = [];
    }
    this.slots = [];
    this.doctorSearchQuery = '';
    this.notes = '';
    this.responsible = '';
    this.isSaving = false;
  }

  // ── Helpers de template ───────────────────────────────────────────────────
  slotStatusClass(slot: Slot): string {
    if (slot.status === 'available')
      return 'border-(--color-success)/40 bg-(--color-success-subtle) text-(--color-success) cursor-pointer hover:border-(--color-success)/70';
    if (slot.status === 'booked')
      return 'border-(--color-border) bg-(--color-bg-overlay) text-(--color-text-disabled) cursor-not-allowed opacity-50';
    return 'border-(--color-danger)/30 bg-(--color-danger-subtle) text-(--color-danger) cursor-not-allowed opacity-50';
  }

  isSelectedSlot(slot: Slot): boolean {
    return this.selectedSlot?.startTime === slot.startTime;
  }

  dayLabel(dayOfWeek: number): string {
    return ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][dayOfWeek];
  }

  get selectedPrice(): number | null {
    if (!this.selectedDoctor || !this.selectedType) return null;
    const commission = this.selectedDoctor.commissions?.find(
      (c) => c.appointmentTypeId === this.selectedType!.id,
    );
    return commission?.price ?? null;
  }
}
