import type { 
  DermatologyRepository, 
  EPS, 
  Treatment, 
  Patient, 
  Consultation 
} from './DermatologyRepository';

const API_BASE_URL = 'http://localhost:3001/api';

export class LocalAPIRepository implements DermatologyRepository {
  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const url = `${API_BASE_URL}${path}`;
    const headers = {
      'Content-Type': 'application/json',
      ...(options?.headers || {})
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || `HTTP Error ${response.status}`);
      }

      return await response.json() as T;
    } catch (err: any) {
      console.error(`Error en petición API local (${url}):`, err.message);
      throw err;
    }
  }

  // --- EPS ---
  async getEPS(): Promise<EPS[]> {
    return this.request<EPS[]>('/eps');
  }

  async createEPS(nombre: string, cobertura_porcentaje: number): Promise<EPS> {
    return this.request<EPS>('/eps', {
      method: 'POST',
      body: JSON.stringify({ nombre, cobertura_porcentaje })
    });
  }

  // --- Tratamientos ---
  async getTreatments(): Promise<Treatment[]> {
    return this.request<Treatment[]>('/tratamientos');
  }

  async createTreatment(nombre: string, precio_base: number): Promise<Treatment> {
    return this.request<Treatment>('/tratamientos', {
      method: 'POST',
      body: JSON.stringify({ nombre, precio_base })
    });
  }

  async updateTreatment(id: string, nombre: string, precio_base: number, activo: boolean): Promise<Treatment> {
    return this.request<Treatment>(`/tratamientos/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ nombre, precio_base, activo })
    });
  }

  // --- Clientes (Pacientes) ---
  async getPatients(): Promise<Patient[]> {
    return this.request<Patient[]>('/clientes');
  }

  async createPatient(patient: Omit<Patient, 'id' | 'created_at' | 'eps_nombre' | 'eps_cobertura'>): Promise<Patient> {
    return this.request<Patient>('/clientes', {
      method: 'POST',
      body: JSON.stringify(patient)
    });
  }

  // --- Consultas (Historial) ---
  async getConsultations(): Promise<Consultation[]> {
    return this.request<Consultation[]>('/consultas');
  }

  async getPatientConsultations(patientId: string): Promise<Consultation[]> {
    return this.request<Consultation[]>(`/consultas/cliente/${patientId}`);
  }

  async createConsultation(consultation: Omit<Consultation, 'id' | 'created_at' | 'cliente_nombres' | 'cliente_apellidos' | 'cliente_documento' | 'tratamiento_nombre' | 'eps_nombre'>): Promise<Consultation> {
    return this.request<Consultation>('/consultas', {
      method: 'POST',
      body: JSON.stringify(consultation)
    });
  }
}
