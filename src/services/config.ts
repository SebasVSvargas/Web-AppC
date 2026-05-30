import type { DermatologyRepository } from './DermatologyRepository';
import { LocalAPIRepository } from './LocalAPIRepository';
import { SupabaseRepository } from './SupabaseRepository';

// Conmutador del repositorio automático. 
// - En local (desarrollo): Se conecta a 'local-api' (microservidor Express local).
// - En Vercel (producción): Se conecta a 'supabase' (nube directa de Supabase).
export const REPOSITORY_MODE: 'local-api' | 'supabase' = import.meta.env.PROD ? 'supabase' : 'local-api';

let activeRepository: DermatologyRepository;

if (REPOSITORY_MODE === 'local-api') {
  activeRepository = new LocalAPIRepository();
} else {
  activeRepository = new SupabaseRepository();
}

// Exportamos la instancia única de acceso a datos para que la UI la consuma directamente.
export const db = activeRepository;
export default db;
