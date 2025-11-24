// Central export point for all repositories (singleton pattern)
export { authRepository } from './authRepository';
export type { Profile } from '../types/auth';

// Re-export base repository for future repositories
export { BaseRepository } from './baseRepository';

// TODO: Add other repositories as they're created
export { prayersRepository } from './prayersRepository';
// export { peopleRepository } from './peopleRepository'; 
// export { intentionsRepository } from './intentionsRepository';
