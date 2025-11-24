import { useEffect, useState } from 'react';
import { prayerGenerationQueue } from '../utils/prayerGenerationQueue';

export function usePrayerGenerationQueueStatus() {
  const [pending, setPending] = useState(0);

  useEffect(() => {
    let isMounted = true;

    prayerGenerationQueue.getPendingCount().then(count => {
      if (isMounted) {
        setPending(count);
      }
    });

    const unsubscribe = prayerGenerationQueue.addListener(status => {
      if (isMounted) {
        setPending(status.pending);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  return {
    pending,
    hasQueuedGeneration: pending > 0,
  };
}
