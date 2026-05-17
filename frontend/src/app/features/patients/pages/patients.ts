import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PatientsService } from '../services/patients.service';
import { Patient, PatientDetail } from '../types/patients.types';

@Component({
  selector: 'app-patients',
  standalone: true,
  imports: [CommonModule],
  providers: [PatientsService],
  templateUrl: './patients.html',
})
export class Patients implements OnInit {
  private patientsService = inject(PatientsService);

  patients: Patient[] = [];
  selectedDetail: PatientDetail | null = null;
  totalCount = 0;

  ngOnInit(): void {
    this.patients = this.patientsService.getPatients();
    this.totalCount = this.patientsService.getTotalCount();
    this.selectPatient(this.patients[0].id);
  }

  selectPatient(id: string): void {
    this.selectedDetail = this.patientsService.getPatientDetail(id);
  }

  isSelected(id: string): boolean {
    return this.selectedDetail?.id === id;
  }
}
