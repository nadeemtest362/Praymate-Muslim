import React, { useContext, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useOnboardingStore } from '../../../stores/onboardingStore';
import { OnboardingFlowContext } from '../../../contexts/OnboardingFlowContext';

interface PaywallScreenProps {
  config: {
    paywallId: string;
    placement: string;
    title?: string;
    subtitle?: string;
    benefits?: {
      icon: string;
      title: string;
      description: string;
    }[];
    skipButtonText?: string;
    continueButtonText?: string;
    showSkipButton?: boolean;
    backgroundGradient?: string[];
  };
  onNext?: () => void;
  onBack?: () => void;
}

export default function PaywallScreen({ config, onNext }: PaywallScreenProps) {
  const { setPaywallShown, setPaywallPlacement, saveStateAtomically } = useOnboardingStore();
  const flowContext = useContext(OnboardingFlowContext);
  const logEvent = flowContext?.logEvent;

  useEffect(() => {
    setPaywallShown(true);
    setPaywallPlacement(config.placement);
    if (logEvent) {
      logEvent('paywall_stub_auto_skip_started', {
        paywall_id: config.paywallId,
        placement: config.placement,
      });
    }
    
    saveStateAtomically()
      .then(() => {
        if (logEvent) {
          logEvent('paywall_stub_state_saved');
        }
      })
      .catch(error => {
        if (logEvent) {
          logEvent('paywall_stub_state_save_failed', {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      });

    if (onNext) {
      onNext();
    }
    if (logEvent) {
      logEvent('paywall_stub_auto_skip_completed', {
        has_next_handler: !!onNext,
      });
    }
  }, [config.placement, onNext, saveStateAtomically, setPaywallPlacement, setPaywallShown]);

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Loading...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
  },
  text: {
    color: 'white',
    fontSize: 16,
  },
}); 