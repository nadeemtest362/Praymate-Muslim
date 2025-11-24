import React from 'react';
import { PrayerPersonForm, PrayerPersonFormData } from '../people';
import { ManualPersonCreationProps } from './types';

export const ManualPersonCreation: React.FC<ManualPersonCreationProps> = ({
  state,
  isLoading,
  contactInfo,
  onRelationshipSelect,
  onNameSubmit,
  onGenderSelect,
  onCancel,
  onBack,
}) => {
  const handleSubmit = async (data: PrayerPersonFormData) => {
    // The PrayerPersonForm handles the step flow internally,
    // so when we get here, we have all the data
    if (data.gender) {
      onGenderSelect(data.gender);
    }
  };

  const initialData: Partial<PrayerPersonFormData> = {
    name: state.name || contactInfo?.name || '',
    relationship: state.selectedRelationship?.label,
    gender: state.gender || undefined,
    image_uri: contactInfo?.image_uri,
    phoneNumber: contactInfo?.phone,
    email: contactInfo?.email,
    deviceContactId: contactInfo?.id,
  };

  return (
    <PrayerPersonForm
      initialData={initialData}
      onSubmit={handleSubmit}
      onCancel={onCancel}
      isSubmitting={isLoading}
      mode="create"
    />
  );
}; 