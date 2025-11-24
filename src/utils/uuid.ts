import { v4 as uuidv4 } from 'uuid';

export const generateClientUUID = (): string => {
  try {
    const uuid = uuidv4();
    console.log('[UUID] Generated UUID successfully with uuid library:', uuid);
    return uuid;
  } catch (error) {
    console.error('[UUID] Error generating UUID with uuid library:', error);
    throw error;
  }
};

export const isClientUUID = (id: string): boolean => {
  // Client UUIDs will be standard v4 format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
};
