export interface EPS {
  id: string;
  nombre: string;
  cobertura_porcentaje: number;
  created_at?: string;
}

export interface Treatment {
  id: string;
  nombre: string;
  precio_base: number;
  activo: boolean;
  created_at?: string;
}

export interface Patient {
  id: string;
  nombres: string;
  apellidos: string;
  documento: string;
  celular: string;
  fecha_nacimiento: string;
  eps_id?: string;
  eps_nombre?: string;
  eps_cobertura?: number;
  created_at?: string;
}

export interface Consultation {
  id: string;
  cliente_id: string;
  cliente_nombres?: string;
  cliente_apellidos?: string;
  cliente_documento?: string;
  fecha: string;
  tratamiento_id: string;
  tratamiento_nombre?: string;
  descripcion?: string;
  costo_aplicado: number;
  eps_id?: string;
  eps_nombre?: string;
  porcentaje_cobertura: number;
  monto_cubierto: number;
  monto_pagado_paciente: number;
  created_at?: string;
}

export interface DermatologyRepository {
  // --- EPS ---
  getEPS(): Promise<EPS[]>;
  createEPS(nombre: string, cobertura_porcentaje: number): Promise<EPS>;

  // --- Tratamientos ---
  getTreatments(): Promise<Treatment[]>;
  createTreatment(nombre: string, precio_base: number): Promise<Treatment>;
  updateTreatment(id: string, nombre: string, precio_base: number, activo: boolean): Promise<Treatment>;

  // --- Clientes (Pacientes) ---
  getPatients(): Promise<Patient[]>;
  createPatient(patient: Omit<Patient, 'id' | 'created_at' | 'eps_nombre' | 'eps_cobertura'>): Promise<Patient>;

  // --- Consultas (Historial) ---
  getConsultations(): Promise<Consultation[]>;
  getPatientConsultations(patientId: string): Promise<Consultation[]>;
  createConsultation(consultation: Omit<Consultation, 'id' | 'created_at' | 'cliente_nombres' | 'cliente_apellidos' | 'cliente_documento' | 'tratamiento_nombre' | 'eps_nombre'>): Promise<Consultation>;
}
