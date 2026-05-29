import type { DermatologyRepository } from './DermatologyRepository';
import { LocalAPIRepository } from './LocalAPIRepository';
import { SupabaseRepository } from './SupabaseRepository';

// Conmutador del repositorio. 
// - 'local-api': Se conecta al microservidor Express local (PostgreSQL local).
// - 'supabase': Se conecta de forma directa a la nube de Supabase (PostgreSQL en la nube).
export const REPOSITORY_MODE: 'local-api' | 'supabase' = 'local-api';

let activeRepository: DermatologyRepository;

if (REPOSITORY_MODE === 'local-api') {
  activeRepository = new LocalAPIRepository();
} else {
  activeRepository = new SupabaseRepository();
}

// Exportamos la instancia única de acceso a datos para que la UI la consuma directamente.
export const db = activeRepository;
export default db;
