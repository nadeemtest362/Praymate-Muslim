/**
 * Analytics Library
 * 
 * CRITICAL: All analytics functions implement defensive error handling.
 * Analytics failures must NEVER surface to users or block application flow.
 * All errors are caught and silently logged to console in development only.
 */

import type PostHog from 'posthog-react-native';
import type { PostHogEventProperties } from '@posthog/core';
import { getPostHogClient } from './posthog';

type AnalyticsProperties = PostHogEventProperties | undefined;

type NullableRecord = Record<string, unknown> | null;

export interface OnboardingStepMetadataInput {
  id?: string;
  screen_type?: string;
  tracking_event_name?: string;
  config?: {
    skippable?: boolean;
    [key: string]: unknown;
  } | null;
}

export interface OnboardingFlowMetadataInput {
  flow_id?: string;
  flow_name?: string;
  flow_version?: string;
  steps?: (OnboardingStepMetadataInput | null | undefined)[] | null;
}

export interface BuildOnboardingPropertiesArgs {
  flow?: OnboardingFlowMetadataInput | null;
  step?: OnboardingStepMetadataInput | null;
  stepIndex?: number;
  stepCount?: number;
  additionalProperties?: Record<string, unknown>;
}

export interface TrackOnboardingOptions {
  flow?: OnboardingFlowMetadataInput | null;
  step?: OnboardingStepMetadataInput | null;
  stepIndex?: number;
  stepCount?: number;
  properties?: Record<string, unknown>;
  client?: PostHog | null;
}

let analyticsContext: NullableRecord = null;

const resolveClient = (client?: PostHog | null): PostHog | null => {
  if (client) {
    return client;
  }

  return getPostHogClient();
};

const copyProperties = (
  source: Record<string, unknown>,
  target: Record<string, unknown>
): void => {
  const keys = Object.keys(source);
  for (let index = 0; index < keys.length; index += 1) {
    const key = keys[index];
    target[key] = source[key];
  }
};

export const setAnalyticsContext = (context?: Record<string, unknown> | null): void => {
  if (!context) {
    analyticsContext = null;
    return;
  }

  const cloned: Record<string, unknown> = {};
  copyProperties(context, cloned);
  analyticsContext = cloned;
};

export const mergeAnalyticsProperties = (
  base: Record<string, unknown> | undefined,
  overlay: Record<string, unknown> | undefined
): PostHogEventProperties => {
  const merged: Record<string, unknown> = {};

  if (base) {
    copyProperties(base, merged);
  }

  if (overlay) {
    copyProperties(overlay, merged);
  }

  return merged as PostHogEventProperties;
};

const buildStepIndex = (
  flow: OnboardingFlowMetadataInput | null | undefined,
  step: OnboardingStepMetadataInput | null | undefined
): number | undefined => {
  if (!flow || !flow.steps || !step || !step.id) {
    return undefined;
  }

  const steps = flow.steps;
  for (let index = 0; index < steps.length; index += 1) {
    const candidate = steps[index];
    if (candidate && candidate.id === step.id) {
      return index;
    }
  }

  return undefined;
};

export const buildOnboardingEventProperties = (
  args: BuildOnboardingPropertiesArgs
): Record<string, unknown> => {
  const { flow, step, stepIndex, stepCount, additionalProperties } = args;
  const properties: Record<string, unknown> = {};

  if (analyticsContext) {
    copyProperties(analyticsContext, properties);
  }

  if (flow) {
    if (flow.flow_id) {
      properties.flow_id = flow.flow_id;
    }
    if (flow.flow_name) {
      properties.flow_name = flow.flow_name;
    }
    if (flow.flow_version) {
      properties.flow_version = flow.flow_version;
    }
  }

  if (typeof stepCount === 'number') {
    properties.flow_step_count = stepCount;
  }

  const resolvedIndex = typeof stepIndex === 'number' ? stepIndex : buildStepIndex(flow, step);
  if (typeof resolvedIndex === 'number') {
    properties.step_order = resolvedIndex;
  }

  if (step) {
    if (step.id) {
      properties.step_id = step.id;
    }
    if (step.screen_type) {
      properties.step_type = step.screen_type;
    }
    if (step.tracking_event_name) {
      properties.step_tracking_event_name = step.tracking_event_name;
    }

    const config = step.config;
    if (config && typeof config === 'object' && Object.prototype.hasOwnProperty.call(config, 'skippable')) {
      const skippableValue = (config as Record<string, unknown>).skippable;
      if (typeof skippableValue === 'boolean') {
        properties.step_skippable = skippableValue;
      }
    }
  }

  if (additionalProperties) {
    copyProperties(additionalProperties, properties);
  }

  return properties;
};

export const trackEvent = (
  name: string,
  properties?: AnalyticsProperties,
  client?: PostHog | null
): void => {
  try {
    const resolved = resolveClient(client);

    if (!resolved) {
      if (__DEV__) {
        console.warn('[analytics] trackEvent skipped - PostHog client unavailable', name);
      }
      return;
    }

    resolved.capture(name, properties);
  } catch (error) {
    // Silently fail - analytics errors should never surface to users
    if (__DEV__) {
      console.warn('[analytics] trackEvent failed (silent):', name, error);
    }
  }
};

export const trackScreen = (
  name: string,
  properties?: AnalyticsProperties,
  client?: PostHog | null
): void => {
  try {
    const resolved = resolveClient(client);

    if (!resolved) {
      if (__DEV__) {
        console.warn('[analytics] trackScreen skipped - PostHog client unavailable', name);
      }
      return;
    }

    resolved.screen(name, properties);
  } catch (error) {
    // Silently fail - analytics errors should never surface to users
    if (__DEV__) {
      console.warn('[analytics] trackScreen failed (silent):', name, error);
    }
  }
};

export const trackOnboardingEvent = (
  name: string,
  options: TrackOnboardingOptions = {}
): void => {
  try {
    const properties = buildOnboardingEventProperties({
      flow: options.flow,
      step: options.step,
      stepIndex: options.stepIndex,
      stepCount: options.stepCount,
      additionalProperties: options.properties,
    });

    trackEvent(name, properties as PostHogEventProperties, options.client);
  } catch (error) {
    // Silently fail - analytics errors should never surface to users
    if (__DEV__) {
      console.warn('[analytics] trackOnboardingEvent failed (silent):', name, error);
    }
  }
};

export const trackOnboardingScreen = (
  name: string,
  options: TrackOnboardingOptions = {}
): void => {
  try {
    const properties = buildOnboardingEventProperties({
      flow: options.flow,
      step: options.step,
      stepIndex: options.stepIndex,
      stepCount: options.stepCount,
      additionalProperties: options.properties,
    });

    trackScreen(name, properties as PostHogEventProperties, options.client);
  } catch (error) {
    // Silently fail - analytics errors should never surface to users
    if (__DEV__) {
      console.warn('[analytics] trackOnboardingScreen failed (silent):', name, error);
    }
  }
};

export const withTiming = async <T>(
  label: string,
  fn: () => Promise<T> | T
): Promise<{ result: T; durationSeconds: number; label: string }> => {
  const start = Date.now();
  const result = await fn();
  const elapsedMs = Date.now() - start;
  const durationSeconds = Math.round((elapsedMs / 1000) * 100) / 100;

  return {
    result,
    durationSeconds,
    label,
  };
};
