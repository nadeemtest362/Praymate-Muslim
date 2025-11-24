import type { CustomerInfo, PurchasesOfferings, PurchasesPackage } from "react-native-purchases";
import { Platform, NativeModules } from "react-native";

type RevenueCatModuleType = typeof import("react-native-purchases");
type PurchasesType = RevenueCatModuleType["default"];
type LogLevelEnum = RevenueCatModuleType["LOG_LEVEL"];

let Purchases: PurchasesType | null = null;
let RevenueCatLogLevel: LogLevelEnum | undefined;

try {
  const nativeModules = NativeModules as Record<string, unknown>;
  const hasNativeModule =
    !!nativeModules?.RNPurchases ||
    !!nativeModules?.RNPurchasesModule ||
    !!nativeModules?.RNPurchasesFlutter;

  if (!hasNativeModule) {
    throw new Error("RevenueCat native module is not installed in this build.");
  }

  const module = require("react-native-purchases") as RevenueCatModuleType;

  const defaultExport = (module as { default?: PurchasesType }).default;
  if (!defaultExport) {
    throw new Error("RevenueCat module did not provide a default export.");
  }

  Purchases = defaultExport;
  RevenueCatLogLevel = module.LOG_LEVEL;
} catch (error) {
  Purchases = null;
  RevenueCatLogLevel = undefined;

  if (__DEV__) {
    const message = error instanceof Error ? error.message : "Unknown error while loading RevenueCat.";
    console.warn(`[RevenueCat] Disabled - ${message}`);
  }
}

const createMockCustomerInfo = (): CustomerInfo => {
  const now = new Date();
  return {
    activeSubscriptions: [],
    allPurchasedProductIdentifiers: [],
    entitlements: { active: {}, all: {}, verification: "NOT_REQUESTED" },
    nonSubscriptionTransactions: [],
    subscriptionsByProductIdentifier: {},
    firstSeen: now.toISOString(),
    originalAppUserId: "mock-user",
    originalApplicationVersion: "1.0.0",
    originalPurchaseDate: null,
    requestDate: now.toISOString(),
    allExpirationDates: {},
    allPurchaseDates: {},
    latestExpirationDate: null,
    managementURL: null,
    originalPurchaseDateMs: null,
    requestDateMs: now.getTime(),
  } as CustomerInfo;
};

// Global flag to prevent multiple initializations
let globalRevenueCatInitialized = false;

// Safely stringify unknown errors for logging
const safeStringify = (value: any): string => {
  try {
    return JSON.stringify(value, (_k, v) => (typeof v === 'bigint' ? v.toString() : v));
  } catch {
    try {
      return String(value);
    } catch {
      return '[unserializable]';
    }
  }
};

type PurchaseErrorInfo = {
  userCancelled?: boolean;
  code?: number | string;
  readableErrorCode?: string;
  domain?: string;
  message?: string;
  underlyingErrorMessage?: string;
};

const extractPurchaseErrorInfo = (err: any): PurchaseErrorInfo => {
  const info: PurchaseErrorInfo = {};
  if (!err || typeof err !== 'object') return info;
  // Common RevenueCat fields
  info.userCancelled = (err as any).userCancelled ?? (err as any).user_cancelled ?? false;
  info.code = (err as any).code ?? (err as any).errorCode ?? (err as any).nativeErrorCode;
  info.readableErrorCode = (err as any).readableErrorCode ?? (err as any).readable_error_code;
  info.message = (err as any).message ?? (err as any).localizedDescription ?? String(err);
  // Sometimes nested info
  const nested = (err as any).info || (err as any).userInfo || {};
  if (nested) {
    info.readableErrorCode = info.readableErrorCode || nested.readableErrorCode || nested.readable_error_code;
    info.domain = nested.domain || nested.NSUnderlyingErrorDomainKey;
    info.underlyingErrorMessage = nested.message || nested.NSLocalizedDescription || nested.underlyingErrorMessage;
  }
  return info;
};

export const interpretPurchaseError = (err: any) => {
  const e = extractPurchaseErrorInfo(err);
  const isUserCancelled = !!e.userCancelled || e.code === 'purchaseCancelledError';
  let brief = e.message || 'Purchase failed';
  // Heuristics for common StoreKit cases
  const codeStr = String(e.code ?? '').toLowerCase();
  const readable = (e.readableErrorCode || '').toLowerCase();
  if (!isUserCancelled) {
    if (readable.includes('payment_not_allowed') || codeStr.includes('paymentnotallowed')) {
      brief = 'Purchases not allowed for this account/device.';
    } else if (readable.includes('product_not_available') || codeStr.includes('productnotavailable')) {
      brief = 'Product not available for your App Store region.';
    } else if (readable.includes('authentication_failed') || codeStr.includes('authentication')) {
      brief = 'Apple ID authentication failed.';
    } else if (readable.includes('billing_unavailable')) {
      brief = 'Billing is unavailable on this device.';
    }
  }
  const debugCode = [e.readableErrorCode, e.code].filter(Boolean).join('/');
  return { isUserCancelled, brief, debugCode };
};

export interface PurchaseResult {
  customerInfo: CustomerInfo;
  productIdentifier: string;
}

export interface SubscriptionStatus {
  isActive: boolean;
  status: string;
  productIdentifier?: string;
}

class RevenueCatService {
  private static instance: RevenueCatService;
  private isInitialized = false;

  private constructor() {}

  static getInstance(): RevenueCatService {
    if (!RevenueCatService.instance) {
      RevenueCatService.instance = new RevenueCatService();
    }
    return RevenueCatService.instance;
  }

  initialize(): void {
    // Simple check - if already initialized, skip
    if (this.isInitialized || globalRevenueCatInitialized) {
      return;
    }

    try {
      const purchases = Purchases;
      if (!purchases) {
        if (__DEV__) {
          console.warn("[RevenueCatService] initialize skipped - native module unavailable, using mock implementation.");
        }
        this.isInitialized = true;
        globalRevenueCatInitialized = true;
        return;
      }

      // Log level: DEBUG in dev builds for diagnosis, ERROR otherwise
      if (RevenueCatLogLevel) {
        const level = __DEV__ ? RevenueCatLogLevel.DEBUG : RevenueCatLogLevel.ERROR;
        try { purchases.setLogLevel(level); } catch {}
      }

      if (Platform.OS === "ios") {
        purchases.configure({ apiKey: "appl_NhoiHxGbPLSZIuSqEPKhqnvVMFk" });
      } else if (Platform.OS === "android") {
        purchases.configure({ apiKey: "" });
        // OR: if building for Amazon, be sure to follow the installation instructions then:
        purchases.configure({ apiKey: "", useAmazon: true });
      }

      this.isInitialized = true;
      globalRevenueCatInitialized = true;
    } catch (error) {
      // If RevenueCat is already configured, that's fine - just mark as initialized
      if (error instanceof Error && (error.message.includes('already set') || error.message.includes('Invalid API key'))) {
        this.isInitialized = true;
        globalRevenueCatInitialized = true;
      } else {
        console.error('[RevenueCatService] Failed to initialize RevenueCat:', error);
        // Don't throw error in development - just mark as initialized
        if (__DEV__) {
          this.isInitialized = true;
          globalRevenueCatInitialized = true;
        } else {
          throw error;
        }
      }
    }
  }

  private ensureInitialized(): void {
    if (!this.isInitialized && !globalRevenueCatInitialized) {
      this.initialize();
    }
  }

  private requireNativeModule(operation: string): PurchasesType {
    if (!Purchases) {
      const message = `${operation} requires the RevenueCat native module. Build a development client or production build with RevenueCat installed.`;
      if (__DEV__) {
        console.warn(`[RevenueCatService] ${message}`);
      }
      throw new Error(message);
    }

    return Purchases;
  }

  isReady(): boolean {
    return this.isInitialized || globalRevenueCatInitialized;
  }

  async getCustomerInfo(): Promise<CustomerInfo> {
    this.ensureInitialized();

    const purchases = Purchases;

    if (!purchases) {
      return createMockCustomerInfo();
    }

    try {
      return await purchases.getCustomerInfo();
    } catch (error) {
      console.error('[RevenueCatService] Error getting customer info:', error);
      throw error;
    }
  }

  async getOfferings(): Promise<PurchasesOfferings> {
    this.ensureInitialized();
    try {
      const purchases = this.requireNativeModule('getOfferings');
      const offerings = await purchases.getOfferings();
      if (__DEV__) {
        try {
          const current = offerings?.current;
          const ids = current ? (current.availablePackages || []).map((p: any) => p?.product?.identifier).filter(Boolean) : [];
          // eslint-disable-next-line no-console
          console.log('[RevenueCatService] Offerings loaded:', { hasCurrent: !!current, packages: ids });
        } catch {}
      }
      return offerings;
    } catch (error) {
      console.error('[RevenueCatService] Error getting offerings:', error);
      throw error;
    }
  }

  async purchasePackage(packageToPurchase: PurchasesPackage): Promise<PurchaseResult> {
    this.ensureInitialized();
    try {
      const purchases = this.requireNativeModule('purchasePackage');
      const { customerInfo, productIdentifier } = await purchases.purchasePackage(packageToPurchase);
      return { customerInfo, productIdentifier };
    } catch (error) {
      const info = extractPurchaseErrorInfo(error);
      console.error('[RevenueCatService] Error purchasing package:', {
        message: info.message,
        code: info.code,
        readableErrorCode: info.readableErrorCode,
        domain: info.domain,
        userCancelled: info.userCancelled,
      });
      try { console.debug('[RevenueCatService] Raw purchase error:', safeStringify(error)); } catch {}
      throw error;
    }
  }

  async restorePurchases(): Promise<CustomerInfo> {
    this.ensureInitialized();
    try {
      const purchases = this.requireNativeModule('restorePurchases');
      return await purchases.restorePurchases();
    } catch (error) {
      console.error('[RevenueCatService] Error restoring purchases:', error);
      throw error;
    }
  }

  async logIn(appUserID: string): Promise<{ customerInfo: CustomerInfo; created: boolean }> {
    this.ensureInitialized();
    try {
      const purchases = this.requireNativeModule('logIn');
      return await purchases.logIn(appUserID);
    } catch (error) {
      console.error('[RevenueCatService] Error logging in:', error);
      throw error;
    }
  }

  async logOut(): Promise<CustomerInfo> {
    this.ensureInitialized();
    try {
      const purchases = this.requireNativeModule('logOut');
      return await purchases.logOut();
    } catch (error) {
      console.error('[RevenueCatService] Error logging out:', error);
      throw error;
    }
  }

  async getSubscriptionStatus(): Promise<SubscriptionStatus> {
    this.ensureInitialized();
    try {
      const customerInfo = await this.getCustomerInfo();
      const activeSubscriptions = customerInfo.activeSubscriptions;
      const allPurchasedProductIdentifiers = customerInfo.allPurchasedProductIdentifiers;
      
      if (activeSubscriptions.length > 0) {
        return {
          isActive: true,
          status: 'active',
          productIdentifier: activeSubscriptions[0]
        };
      } else if (allPurchasedProductIdentifiers.length > 0) {
        return {
          isActive: false,
          status: 'expired',
          productIdentifier: allPurchasedProductIdentifiers[0]
        };
      } else {
        return {
          isActive: false,
          status: 'never_purchased'
        };
      }
    } catch (error) {
      console.error('[RevenueCatService] Error getting subscription status:', error);
      throw error;
    }
  }

  async hasActiveSubscription(): Promise<boolean> {
    try {
      const status = await this.getSubscriptionStatus();
      return status.isActive;
    } catch (error) {
      console.error('[RevenueCatService] Error checking active subscription:', error);
      return false;
    }
  }

  async getSimpleSubscriptionStatus(): Promise<'active' | 'expired' | 'never_purchased' | 'unknown'> {
    try {
      if (!this.isReady()) {
        console.warn('RevenueCat service is not ready yet');
        return 'unknown';
      }
      
      const customerInfo = await this.getCustomerInfo();
      const activeSubscriptions = customerInfo.activeSubscriptions;
      const allPurchasedProductIdentifiers = customerInfo.allPurchasedProductIdentifiers;
      
      if (activeSubscriptions.length > 0) {
        return 'active';
      } else if (allPurchasedProductIdentifiers.length > 0) {
        return 'expired';
      } else {
        return 'never_purchased';
      }
    } catch (error) {
      console.error('[RevenueCatService] Error getting simple subscription status:', error);
      return 'unknown';
    }
  }
}

// Export singleton instance
export const revenueCatService = RevenueCatService.getInstance();
