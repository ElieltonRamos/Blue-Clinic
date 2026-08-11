export interface AppointmentType {
  id: number;
  name: string;
  duration: number;
  isRetorno: boolean;
}

export interface CreateAppointmentTypeRequest {
  name: string;
  duration: number;
  isRetorno?: boolean;
}

export interface UpdateAppointmentTypeRequest {
  name: string;
  duration: number;
  isRetorno?: boolean;
}
