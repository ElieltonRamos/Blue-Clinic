export interface AppointmentType {
  id: number;
  name: string;
  duration: number;
}

export interface CreateAppointmentTypeRequest {
  name: string;
  duration: number;
}

export interface UpdateAppointmentTypeRequest {
  name: string;
  duration: number;
}
