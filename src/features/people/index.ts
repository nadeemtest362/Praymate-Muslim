// People feature exports
export { 
  usePeople, 
  useAllPeople, 
  useAddPersonOnly, 
  useUpdatePerson, 
  useDeletePerson, 
  useAddPersonWithIntention 
} from './hooks/usePeople';

// Export form components
export { PrayerPersonForm } from './PrayerPersonForm';
export type { PrayerPersonFormData } from './PrayerPersonForm';

// Re-export types from repository
export type { 
  PrayerPerson, 
  AddPrayerPersonParams, 
  AddPrayerPersonOnlyParams, 
  UpdatePrayerPersonParams, 
  PeopleCursor 
} from '../../repositories/peopleRepository';
