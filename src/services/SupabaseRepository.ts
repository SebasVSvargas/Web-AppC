import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { 
  DermatologyRepository, 
  EPS, 
  Treatment, 
  Patient, 
  Consultation 
} from './DermatologyRepository';

// Estas constantes se cargarán desde variables de entorno en producción.
const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string) || 'https://placeholder.supabase.co';
const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || 'placeholder-key';

export class SupabaseRepository implements DermatologyRepository {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }

  // --- EPS ---
  async getEPS(): Promise<EPS[]> {
    const { data, error } = await this.supabase
      .from('eps')
      .select('*')
      .order('nombre', { ascending: true });

    if (error) throw error;
    return data as EPS[];
  }

  async createEPS(nombre: string, cobertura_porcentaje: number): Promise<EPS> {
    const { data, error } = await this.supabase
      .from('eps')
      .insert([{ nombre, cobertura_porcentaje }])
      .select()
      .single();

    if (error) throw error;
    return data as EPS;
  }

  // --- Tratamientos ---
  async getTreatments(): Promise<Treatment[]> {
    const { data, error } = await this.supabase
      .from('tratamientos')
      .select('*')
      .eq('activo', true)
      .order('nombre', { ascending: true });

    if (error) throw error;
    return data as Treatment[];
  }

  async createTreatment(nombre: string, precio_base: number): Promise<Treatment> {
    const { data, error } = await this.supabase
      .from('tratamientos')
      .insert([{ nombre, precio_base }])
      .select()
      .single();

    if (error) throw error;
    return data as Treatment;
  }

  async updateTreatment(id: string, nombre: string, precio_base: number, activo: boolean): Promise<Treatment> {
    const { data, error } = await this.supabase
      .from('tratamientos')
      .update({ nombre, precio_base, activo })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Treatment;
  }

  // --- Clientes (Pacientes) ---
  async getPatients(): Promise<Patient[]> {
    // Obtenemos clientes y unimos con su EPS correspondiente usando sintaxis de Supabase
    const { data, error } = await this.supabase
      .from('clientes')
      .select(`
        *,
        eps:eps_id (nombre, cobertura_porcentaje)
      `)
      .order('apellidos', { ascending: true });

    if (error) throw error;
    
    // Mapeamos el resultado para aplanar la respuesta y que sea idéntica a la local
    return (data || []).map((row: any) => ({
      ...row,
      eps_nombre: row.eps?.nombre || undefined,
      eps_cobertura: row.eps?.cobertura_porcentaje !== undefined ? row.eps.cobertura_porcentaje : undefined
    })) as Patient[];
  }

  async createPatient(patient: Omit<Patient, 'id' | 'created_at' | 'eps_nombre' | 'eps_cobertura'>): Promise<Patient> {
    const { data, error } = await this.supabase
      .from('clientes')
      .insert([patient])
      .select()
      .single();

    if (error) throw error;

    // Volver a consultar con la EPS unida para entregar el objeto completo de respuesta
    const { data: fullPatient, error: getError } = await this.supabase
      .from('clientes')
      .select(`
        *,
        eps:eps_id (nombre, cobertura_porcentaje)
      `)
      .eq('id', data.id)
      .single();

    if (getError) throw getError;

    return {
      ...fullPatient,
      eps_nombre: fullPatient.eps?.nombre || undefined,
      eps_cobertura: fullPatient.eps?.cobertura_porcentaje !== undefined ? fullPatient.eps.cobertura_porcentaje : undefined
    } as Patient;
  }

  // --- Consultas (Historial) ---
  async getConsultations(): Promise<Consultation[]> {
    const { data, error } = await this.supabase
      .from('consultas')
      .select(`
        *,
        cliente:cliente_id (nombres, apellidos, documento),
        tratamiento:tratamiento_id (nombre),
        eps:eps_id (nombre)
      `)
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map((row: any) => ({
      ...row,
      cliente_nombres: row.cliente?.nombres || undefined,
      cliente_apellidos: row.cliente?.apellidos || undefined,
      cliente_documento: row.cliente?.documento || undefined,
      tratamiento_nombre: row.tratamiento?.nombre || undefined,
      eps_nombre: row.eps?.nombre || undefined
    })) as Consultation[];
  }

  async getPatientConsultations(patientId: string): Promise<Consultation[]> {
    const { data, error } = await this.supabase
      .from('consultas')
      .select(`
        *,
        tratamiento:tratamiento_id (nombre),
        eps:eps_id (nombre)
      `)
      .eq('cliente_id', patientId)
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map((row: any) => ({
      ...row,
      tratamiento_nombre: row.tratamiento?.nombre || undefined,
      eps_nombre: row.eps?.nombre || undefined
    })) as Consultation[];
  }

  async createConsultation(consultation: Omit<Consultation, 'id' | 'created_at' | 'cliente_nombres' | 'cliente_apellidos' | 'cliente_documento' | 'tratamiento_nombre' | 'eps_nombre'>): Promise<Consultation> {
    const { data, error } = await this.supabase
      .from('consultas')
      .insert([consultation])
      .select()
      .single();

    if (error) throw error;

    // Volver a consultar con uniones para retornar el historial completo
    const { data: fullConsultation, error: getError } = await this.supabase
      .from('consultas')
      .select(`
        *,
        cliente:cliente_id (nombres, apellidos, documento),
        tratamiento:tratamiento_id (nombre),
        eps:eps_id (nombre)
      `)
      .eq('id', data.id)
      .single();

    if (getError) throw getError;

    return {
      ...fullConsultation,
      cliente_nombres: fullConsultation.cliente?.nombres || undefined,
      cliente_apellidos: fullConsultation.cliente?.apellidos || undefined,
      cliente_documento: fullConsultation.cliente?.documento || undefined,
      tratamiento_nombre: fullConsultation.tratamiento?.nombre || undefined,
      eps_nombre: fullConsultation.eps?.nombre || undefined
    } as Consultation;
  }
}
