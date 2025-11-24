import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  StatusBar,
  Animated,
  ActivityIndicator,
  Easing,
  Linking,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import OnboardingGradientBackground from "../../../components/shared/OnboardingGradientBackground";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useOnboardingStore } from "../../../stores/onboardingStore";
import useResponsive from "../../../hooks/useResponsive";
import {
  SUBSCRIPTION_PRODUCTS,
} from "../../../config/constants";
import { revenueCatService } from "../../../lib/revenueCatService";
import type { PurchasesOfferings } from "react-native-purchases";
import PaymentBottomSheet from "../../../components/shared/PaymentBottomSheet";
import { OnboardingFlowContext } from "../../../contexts/OnboardingFlowContext";

interface FirstPaywallScreenProps {
  config: {
    title: string;
    subtitle: string;
    backgroundGradient: string[];
    logo: {
      emoji: string;
      size: number;
    };
    pricing: {
      mainOffer: string;
      description: string;
    };
    features: {
      id: string;
      icon: string;
      title: string;
      description: string;
    }[];
    cta: {
      text: string;
      gradient: string[];
    };
    alternatives: {
      viewAllPlans: {
        enabled: boolean;
        text: string;
      };
      fineprint: {
        enabled: boolean;
        text: string;
      };
    };
    tracking: {
      screenViewEvent: string;
      ctaTappedEvent: string;
      viewAllPlansTappedEvent: string;
    };
  };
  onNext: () => void;
  onViewAllPlans?: () => void;
}

export default function FirstPaywallScreen({
  config,
  onNext,
  onViewAllPlans,
}: FirstPaywallScreenProps) {
  const R = useResponsive();
  const styles = useMemo(() => createStyles(R), [R]);

  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingPaywall, setIsLoadingPaywall] = useState(true);
  const [products, setProducts] = useState<any[]>([]);
  const [mergedConfig, setMergedConfig] = useState(config);
  const [selectedPlan, setSelectedPlan] = useState<"weekly" | "annual">(
    "weekly"
  ); // Default to weekly
  const [offering, setOffering] = useState<PurchasesOfferings | null>(null);
  const [showPaymentSheet, setShowPaymentSheet] = useState(false);
  const [paymentCompleted, setPaymentCompleted] = useState(false);
  const [currentTestimonialIndex, setCurrentTestimonialIndex] = useState(0);
  const flowContext = React.useContext(OnboardingFlowContext);
  const logEvent = flowContext?.logEvent;

  // get Offerings RC
  async function getOfferings() {
    try {
      const offerings = await revenueCatService.getOfferings();
      if (
        offerings.current !== null &&
        offerings.current.availablePackages.length !== 0
      ) {
        setOffering(offerings);
      }
    } catch (error) {
      if (logEvent) {
        logEvent('paywall_offerings_fetch_failed', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  useEffect(() => {
    getOfferings();
  }, []);

  // Update selected plan based on available offerings
  useEffect(() => {
    if (offering?.current) {
      if (offering.current.weekly && !offering.current.annual) {
        setSelectedPlan("weekly");
      } else if (offering.current.annual && !offering.current.weekly) {
        setSelectedPlan("annual");
      }
    }
  }, [offering]);
  // Animation values
  const continuationOpacity = useRef(new Animated.Value(0)).current;
  const continuationScale = useRef(new Animated.Value(0.8)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslateY = useRef(new Animated.Value(30)).current;

  const featuresOpacity = useRef(new Animated.Value(0)).current;
  const ctaOpacity = useRef(new Animated.Value(0)).current;
  const ctaTranslateY = useRef(new Animated.Value(20)).current;

  // Shimmer animation
  const shimmerAnimation = useRef(new Animated.Value(0)).current;

  // Load paywall data using RevenueCat
  const loadPaywallData = useCallback(async () => {
    try {
      setIsLoadingPaywall(true);

      // Get offerings from RevenueCat
      const offerings = await revenueCatService.getOfferings();
      if (offerings.current && offerings.current.availablePackages.length > 0) {
        setOffering(offerings);
        
        // Convert RevenueCat packages to our products format
        const revenueCatProducts = offerings.current.availablePackages.map(pkg => ({
          vendorProductId: pkg.identifier,
          price: pkg.product.price,
          currencyCode: pkg.product.currencyCode,
          localizedPrice: pkg.product.priceString,
          title: pkg.product.title,
          description: pkg.product.description,
          packageType: pkg.packageType,
          product: pkg.product
        }));

        setProducts(revenueCatProducts);

        // Update pricing display with actual product prices
        updatePricingDisplay(revenueCatProducts);
      } else {
        if (logEvent) {
          logEvent('paywall_no_offerings_available');
        }
      }
    } catch (error) {
      if (logEvent) {
        logEvent('paywall_load_failed', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
      Alert.alert(
        "Error",
        "Failed to load subscription options. Please check your connection and try again."
      );
      // Continue with local config on error
    } finally {
      setIsLoadingPaywall(false);
    }
  }, [config, logEvent]);

  // Fetch RevenueCat paywall data
  useEffect(() => {
    loadPaywallData();
  }, [loadPaywallData]);


  // Start glow animation for free trial
  useEffect(() => {
    if (selectedPlan === "weekly") {
      // Create a subtle pulsing glow
      Animated.loop(
        Animated.sequence([
          Animated.timing(shimmerAnimation, {
            toValue: 1,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(shimmerAnimation, {
            toValue: 0,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      // Stop animation when not on free trial
      shimmerAnimation.stopAnimation();
      shimmerAnimation.setValue(0);
    }
  }, [selectedPlan, shimmerAnimation]);

  // Start animations after paywall loads
  useEffect(() => {
    if (!isLoadingPaywall) {
      // Orchestrated entrance animation
      Animated.sequence([
        // Continuation indicator appears first
        Animated.parallel([
          Animated.timing(continuationOpacity, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.spring(continuationScale, {
            toValue: 1,
            tension: 60,
            friction: 8,
            useNativeDriver: true,
          }),
        ]),

        // Header content slides up
        Animated.parallel([
          Animated.timing(headerOpacity, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(headerTranslateY, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
          }),
        ]),

        // Features fade in
        Animated.timing(featuresOpacity, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),

        // CTA slides up
        Animated.parallel([
          Animated.timing(ctaOpacity, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(ctaTranslateY, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    }
  }, [
    isLoadingPaywall,
    continuationOpacity,
    continuationScale,
    headerOpacity,
    headerTranslateY,
    featuresOpacity,
    ctaOpacity,
    ctaTranslateY,
  ]);

  const updatePricingDisplay = (fetchedProducts: any[]) => {
    // Find weekly and annual products
    const weeklyProduct = fetchedProducts.find(
      (p) => p.vendorProductId === SUBSCRIPTION_PRODUCTS.WEEKLY
    );
    const annualProduct = fetchedProducts.find(
      (p) => p.vendorProductId === SUBSCRIPTION_PRODUCTS.ANNUAL
    );

    if (weeklyProduct || annualProduct) {
      let description = mergedConfig.pricing.description;

      // Update pricing text with actual prices from RevenueCat
      if (
        weeklyProduct?.localizedPrice &&
        annualProduct?.localizedPrice
      ) {
        // Calculate savings percentage if we have the amounts
        if (weeklyProduct.price && annualProduct.price) {
          const weeklyTotal = weeklyProduct.price * 52;
          const savings = Math.round(
            ((weeklyTotal - annualProduct.price) / weeklyTotal) * 100
          );
          description = `${weeklyProduct.localizedPrice}/week or ${annualProduct.localizedPrice}/year (save ${savings}%)`;
        } else {
          description = `${weeklyProduct.localizedPrice}/week or ${annualProduct.localizedPrice}/year`;
        }
      } else if (weeklyProduct?.localizedPrice) {
        description = `${weeklyProduct.localizedPrice}/week • Cancel anytime`;
      } else if (annualProduct?.localizedPrice) {
        description = `${annualProduct.localizedPrice}/year • Cancel anytime`;
      }

      setMergedConfig((prev) => ({
        ...prev,
        pricing: {
          ...prev.pricing,
          description,
        },
      }));
    }
  };

  // Handle CTA button press - always show payment sheet first
  const handleCTAPress = async () => {
    if (logEvent) {
      logEvent('paywall_cta_clicked', {
        selected_plan: selectedPlan,
        has_products: products.length > 0,
      });
    }

    setShowPaymentSheet(true);
    
    if (logEvent) {
      logEvent('paywall_payment_sheet_shown', {
        selected_plan: selectedPlan,
      });
    }
  };

  // Handle successful payment from payment sheet
  const handlePaymentSuccess = () => {
    if (logEvent) {
      logEvent('paywall_payment_success', {
        selected_plan: selectedPlan,
      });
    }
    setShowPaymentSheet(false);
    setPaymentCompleted(true);
    // Show account creation sheet after successful payment
    onNext();
  };

  // Handle payment failure from payment sheet
  const handlePaymentFailure = () => {
    if (logEvent) {
      logEvent('paywall_payment_failed', {
        selected_plan: selectedPlan,
      });
    }
    setShowPaymentSheet(false);
    // Show account creation sheet even on payment failure as requested
    // TODO: Will ask nadeem what should we do in faliure case
  };

  // Handle closing payment sheet without completion
  const handlePaymentClose = () => {
    if (logEvent) {
      logEvent('paywall_payment_closed');
    }
    setShowPaymentSheet(false);
  };

  // Handle email press in sign up sheet
  const handleEmailPress = () => {
    // This is handled within the SignUpBottomSheet component
  };

  const handleRestorePurchases = async () => {
    try {
      setIsLoading(true);

      // Use RevenueCat's restorePurchases
      const customerInfo = await revenueCatService.restorePurchases();

      if (customerInfo.entitlements.active && Object.keys(customerInfo.entitlements.active).length > 0) {
        if (logEvent) {
          logEvent('paywall_restore_success');
        }
        Alert.alert(
          "Purchases Restored",
          "Your subscription has been restored successfully.",
          [{ text: "Continue", onPress: onNext }]
        );
      } else {
        if (logEvent) {
          logEvent('paywall_restore_no_purchases');
        }
        Alert.alert(
          "No Purchases Found",
          "No active subscriptions found to restore."
        );
      }
    } catch (error: any) {
      if (logEvent) {
        logEvent('paywall_restore_failed', {
          error: error?.message,
        });
      }
      Alert.alert(
        "Restore Failed",
        error.message || "Unable to restore purchases. Please try again later."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewAllPlans = () => {
    if (logEvent) {
      logEvent('paywall_no_thanks_clicked');
    }
    if (onViewAllPlans) {
      onViewAllPlans();
    } else {
      onNext();
    }
  };

  const handleTestimonialScroll = (event: any) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const cardWidth = R.w(83); // Card width + margin
    const index = Math.round(scrollPosition / cardWidth);
    setCurrentTestimonialIndex(index);
    if (logEvent) {
      logEvent('paywall_testimonial_scrolled', {
        testimonial_index: index,
      });
    }
  };

  // Show loading state while fetching paywall
  if (isLoadingPaywall) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <OnboardingGradientBackground />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.loadingText}>
            Loading...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <OnboardingGradientBackground />

      {/* Scrollable Top Section */}
      <ScrollView
        style={styles.scrollableSection}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: R.insets.top,
            paddingBottom: R.h(20), // Extra padding for fixed bottom section
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Continuation Indicator */}
        <Animated.View
          style={[
            styles.continuationIndicator,
            {
              opacity: continuationOpacity,
              transform: [{ scale: continuationScale }],
            },
          ]}
        >
          <View style={styles.progressDots}>
            <View style={[styles.dot, styles.dotCompleted]} />
            <View style={[styles.dot, styles.dotCompleted]} />
            <View style={[styles.dot, styles.dotActive]} />
          </View>
        </Animated.View>

        {/* Header Section */}
        <Animated.View
          style={[
            styles.header,
            {
              opacity: headerOpacity,
              transform: [{ translateY: headerTranslateY }],
            },
          ]}
        >
          {/* Early Access Badge */}
          <View style={styles.earlyAccessBadge}>
            <MaterialCommunityIcons
              name="check-circle"
              size={R.w(3.5)}
              color="#FFD700"
            />
            <Text style={styles.earlyAccessText}>
              Your Prayer Is Almost Ready
            </Text>
          </View>

          <Text style={styles.title}>{mergedConfig.title}</Text>
          <Text style={styles.subtitle}>{mergedConfig.subtitle}</Text>
        </Animated.View>

        {/* Key Benefits */}
        <Animated.View
          style={[styles.featuresSection, { opacity: featuresOpacity }]}
        >
          <View style={styles.benefitRow}>
            <View style={styles.iconWrapper}>
              <MaterialCommunityIcons
                name="heart-circle"
                size={R.w(4.5)}
                color="#FFD700"
              />
            </View>
            <View style={styles.benefitTextContainer}>
              <Text style={styles.benefitTitle}>
                Personalized Daily Prayers
              </Text>
              <Text style={styles.benefitDescription}>
                Crafted specifically for your life, your people, and what
                matters to you
              </Text>
            </View>
          </View>

          <View style={styles.benefitRow}>
            <View style={styles.iconWrapper}>
              <MaterialCommunityIcons
                name="white-balance-sunny"
                size={R.w(4.5)}
                color="#FFD700"
              />
            </View>
            <View style={styles.benefitTextContainer}>
              <Text style={styles.benefitTitle}>
                Morning & Evening Guidance
              </Text>
              <Text style={styles.benefitDescription}>
                Start and end each day connected to God with prayers that evolve
                with you
              </Text>
            </View>
          </View>

          <View style={styles.benefitRow}>
            <View style={styles.iconWrapper}>
              <MaterialCommunityIcons
                name="chart-line"
                size={R.w(4.5)}
                color="#FFD700"
              />
            </View>
            <View style={styles.benefitTextContainer}>
              <Text style={styles.benefitTitle}>Block Distracting Apps with PRAYBLOCK</Text>
              <Text style={styles.benefitDescription}>
                Turn distractions into devotion by blocking social media, entertainment, and other distracting apps until you complete your morning or evening prayer.
              </Text>
            </View>
          </View>

          <View style={styles.benefitRow}>
            <View style={styles.iconWrapper}>
              <MaterialCommunityIcons
                name="account-group"
                size={R.w(4.5)}
                color="#FFD700"
              />
            </View>
            <View style={styles.benefitTextContainer}>
              <Text style={styles.benefitTitle}>Pray for Your People</Text>
              <Text style={styles.benefitDescription}>
                Keep loved ones in your daily prayers with personalized
                intentions
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Value/Why Premium Section */}
        <Animated.View
          style={[styles.valueSection, { opacity: featuresOpacity }]}
        >
          <View style={styles.sectionDivider} />
          
          <Text style={styles.valueSectionTitle}>
            Why Does This Cost Money?
          </Text>
          <Text style={styles.valueBody}>
            We get it — prayer should be free, and it is. You can always pray 
            directly to God, anytime, anywhere.
          </Text>
          <Text style={styles.valueBody}>
            But here's what joining praymate plus gives you:
          </Text>



          <View style={styles.valuePoint}>
            <MaterialCommunityIcons
              name="account-heart"
              size={R.w(5)}
              color="#FFD700"
            />
            <View style={styles.valuePointText}>
              <Text style={styles.valuePointTitle}>Real People, Real Care</Text>
              <Text style={styles.valuePointDesc}>
                We are a small team of believers working every day to help all Christians grow closer to God, 
                through the power of prayer.
              </Text>
            </View>
          </View>

          <View style={styles.valuePoint}>
            <MaterialCommunityIcons
              name="server"
              size={R.w(5)}
              color="#FFD700"
            />
            <View style={styles.valuePointText}>
              <Text style={styles.valuePointTitle}>Enhancing Your Experience</Text>
              <Text style={styles.valuePointDesc}>
                In order to continue making praymate the best personal prayer companion for you, there are costs involved in maintaining and improving the app.
              </Text>
            </View>
          </View>

        

          <View style={styles.valuePoint}>
            <MaterialCommunityIcons
              name="hand-heart"
              size={R.w(5)}
              color="#FFD700"
            />
            <View style={styles.valuePointText}>
              <Text style={styles.valuePointTitle}>A Mission Worth Supporting</Text>
              <Text style={styles.valuePointDesc}>
                Your subscription helps us reach more people who are searching 
                for a deeper connection with God
              </Text>
            </View>
          </View>

          <View style={styles.valueCallout}>
            <MaterialCommunityIcons
              name="heart"
              size={R.w(4.5)}
              color="#FFD700"
            />
            <Text style={styles.valueCalloutText}>
              Think of it as supporting your own spiritual growth while helping 
              others find theirs.
            </Text>
          </View>
        </Animated.View>

        {/* Transformation Story Section */}
        <Animated.View
          style={[styles.transformationSection, { opacity: featuresOpacity }]}
        >
          <View style={styles.sectionDivider} />
          
          <Text style={styles.transformationTitle}>
            From Scattered Thoughts to Sacred Moments
          </Text>
          <Text style={styles.transformationBody}>
            You've tried to pray, but the words don't come. Your mind wanders. 
            You wonder if God is even listening.
          </Text>
          <Text style={styles.transformationBody}>
            <Text style={styles.transformationHighlight}>What if prayer could be different?</Text>
            {' '}What if every morning you woke to words that spoke directly to your heart? 
            What if you could feel God's presence in the chaos of daily life?
          </Text>
          <Text style={styles.transformationBody}>
            That's not just possible — it's what happens when prayer becomes personal, 
            intentional, and guided by what matters most to you.
          </Text>
        </Animated.View>

        

        {/* 30-Day Journey Visualization */}
        <Animated.View
          style={[styles.journeySection, { opacity: featuresOpacity }]}
        >
          <View style={styles.sectionDivider} />
          
          <Text style={styles.journeySectionTitle}>
            Your 30-Day Journey to Deeper Faith
          </Text>
          <Text style={styles.journeySubtitle}>
            Watch how your relationship with God transforms
          </Text>

          <View style={styles.journeyTimeline}>
            <View style={styles.journeyMilestone}>
              <View style={styles.milestoneCircle}>
                <Text style={styles.milestoneDay}>Day 1-7</Text>
              </View>
              <View style={styles.milestoneContent}>
                <Text style={styles.milestoneTitle}>Foundation</Text>
                <Text style={styles.milestoneDesc}>
                  Prayers feel personal. You start looking forward to them.
                </Text>
              </View>
            </View>

            <View style={styles.milestoneLine} />

            <View style={styles.journeyMilestone}>
              <View style={styles.milestoneCircle}>
                <Text style={styles.milestoneDay}>Day 8-14</Text>
              </View>
              <View style={styles.milestoneContent}>
                <Text style={styles.milestoneTitle}>Connection</Text>
                <Text style={styles.milestoneDesc}>
                  God's voice becomes clearer. Prayer is no longer a chore.
                </Text>
              </View>
            </View>

            <View style={styles.milestoneLine} />

            <View style={styles.journeyMilestone}>
              <View style={styles.milestoneCircle}>
                <Text style={styles.milestoneDay}>Day 15-21</Text>
              </View>
              <View style={styles.milestoneContent}>
                <Text style={styles.milestoneTitle}>Transformation</Text>
                <Text style={styles.milestoneDesc}>
                  You notice peace in chaos. Your faith is growing.
                </Text>
              </View>
            </View>

            <View style={styles.milestoneLine} />

            <View style={styles.journeyMilestone}>
              <View style={[styles.milestoneCircle, styles.milestoneCircleGold]}>
                <Text style={styles.milestoneDay}>Day 22-30</Text>
              </View>
              <View style={styles.milestoneContent}>
                <Text style={[styles.milestoneTitle, styles.milestoneTitleGold]}>
                  Intimacy
                </Text>
                <Text style={styles.milestoneDesc}>
                  Prayer is now a conversation with a Friend who knows you completely.
                </Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Final Invitation Section */}
        <Animated.View
          style={[styles.finalInvitationSection, { opacity: featuresOpacity }]}
        >
          <View style={styles.sectionDivider} />
          
          <MaterialCommunityIcons
            name="hands-pray"
            size={R.w(12)}
            color="#FFD700"
            style={styles.finalIcon}
          />
          
          <Text style={styles.finalTitle}>
            Your Spiritual Journey Starts Now
          </Text>
          <Text style={styles.finalBody}>
            God is waiting to meet you in prayer — not with empty words or 
            religious formulas, but with truth that speaks to your soul.
          </Text>
          <Text style={styles.finalBody}>
            Others are already experiencing what it means to pray with purpose, 
            intention, and joy.
          </Text>
          
          <View style={styles.urgencyBadge}>
            <MaterialCommunityIcons
              name="clock-outline"
              size={R.w(4)}
              color="#FFD700"
            />
            <Text style={styles.urgencyText}>
              Early Access Pricing — Limited Time
            </Text>
          </View>

          <Text style={styles.finalQuestion}>
            Are you ready to finally experience the prayer life you've been longing for?
          </Text>
        </Animated.View>
      </ScrollView>

      {/* Fixed Bottom Section */}
      <Animated.View
        style={[
          styles.fixedBottomSection,
          {
            opacity: ctaOpacity,
            transform: [{ translateY: ctaTranslateY }],
          },
          { paddingBottom: R.insets.bottom || R.h(2) },
        ]}
      >

        {/* Trust Badge */}
        <View style={styles.trustBadge}>
          <MaterialCommunityIcons
            name="check-circle"
            size={R.w(4)}
            color="#FFF"
          />
          <Text style={styles.trustText}>
            {selectedPlan === "weekly" &&
            offering?.current?.weekly?.product?.introPrice
              ? "NO PAYMENT NOW"
              : "CANCEL ANYTIME"}
          </Text>
        </View>
        {/* Plan Options */}
        {offering?.current?.annual && (
          <TouchableOpacity
            style={[
              styles.planOption,
              selectedPlan === "annual" && styles.planOptionSelected,
            ]}
            onPress={() => setSelectedPlan("annual")}
            activeOpacity={0.8}
          >
            <View style={styles.planBadgePositioner}>
              <View style={styles.planBadge}>
                <Text style={styles.planBadgeText}>BEST OFFER</Text>
              </View>
            </View>
            <View style={styles.planTextContainer}>
              <Text style={styles.planMainText}>YEARLY ACCESS</Text>
              <Text style={styles.planDescText}>
                Just {offering.current.annual.product.priceString} per year
              </Text>
            </View>
            <View style={styles.planPriceContainer}>
              <Text style={styles.planPriceAmount}>
                {offering.current.annual.product.pricePerWeekString}
              </Text>
              <Text style={styles.planPriceUnit}>per week</Text>
            </View>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[
            styles.planOption,
            selectedPlan === "weekly" && styles.planOptionSelected,
          ]}
          onPress={() => setSelectedPlan("weekly")}
          activeOpacity={0.8}
        >
          <View style={styles.planTextContainer}>
            <Text style={styles.planMainText}>
              {offering?.current?.weekly?.product?.introPrice
                ? `${offering.current.weekly.product.introPrice.periodNumberOfUnits}-DAY FREE TRIAL`
                : "3-DAY FREE TRIAL"}
            </Text>
          </View>
          <View style={styles.planPriceContainer}>
            <Text style={styles.planPriceAmount}>
              then {offering?.current?.weekly?.product?.priceString || "$4.99"}
            </Text>
            <Text style={styles.planPriceUnit}>per week</Text>
          </View>
        </TouchableOpacity>

        

        {/* CTA Button */}
        <TouchableOpacity
          style={styles.ctaButton}
          onPress={handleCTAPress}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={["#FFD700", "#FF8C42"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.ctaGradient}
          >
            <Text style={styles.ctaText}>
              {selectedPlan === "weekly" &&
              offering?.current?.weekly?.product?.introPrice
                ? "Try for Free"
                : "Continue"}
            </Text>
            <MaterialCommunityIcons
              name="chevron-right"
              size={R.w(6)}
              color="#1A1B4B"
            />
            {/* Glow overlay for free trial */}
            {selectedPlan === "weekly" && (
              <Animated.View
                style={[
                  styles.shimmerOverlay,
                  {
                    opacity: shimmerAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 0.2],
                    }),
                  },
                ]}
              >
                <LinearGradient
                  colors={[
                    "rgba(255, 255, 255, 0.3)",
                    "rgba(255, 255, 255, 0.1)",
                  ]}
                  start={{ x: 0.5, y: 0 }}
                  end={{ x: 0.5, y: 1 }}
                  style={styles.shimmerGradient}
                />
              </Animated.View>
            )}
          </LinearGradient>
        </TouchableOpacity>

        

        {/* No Thanks Link */}
        {mergedConfig.alternatives.viewAllPlans.enabled && (
          <TouchableOpacity onPress={handleViewAllPlans}>
            <Text style={styles.noThanksText}>
              {mergedConfig.alternatives.viewAllPlans.text}
            </Text>
          </TouchableOpacity>
        )}

        {/* Footer Links */}
        <View style={styles.footerLinks}>
          <TouchableOpacity onPress={() => Linking.openURL('https://trypraymate.com/#terms')}>
            <Text style={styles.footerLink}>Terms</Text>
          </TouchableOpacity>
          <Text style={styles.footerDivider}>•</Text>
          <TouchableOpacity onPress={() => Linking.openURL('https://trypraymate.com/#privacy')}>
            <Text style={styles.footerLink}>Privacy</Text>
          </TouchableOpacity>
          <Text style={styles.footerDivider}>•</Text>
          <TouchableOpacity onPress={() => Linking.openURL('https://www.apple.com/legal/internet-services/itunes/dev/stdeula/')}>
            <Text style={styles.footerLink}>EULA</Text>
          </TouchableOpacity>
          <Text style={styles.footerDivider}>•</Text>
          <TouchableOpacity onPress={handleRestorePurchases}>
            <Text style={styles.footerLink}>Restore</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Payment Bottom Sheet */}
      <PaymentBottomSheet
        isVisible={showPaymentSheet}
        onPaymentSuccess={handlePaymentSuccess}
        onPaymentFailure={handlePaymentFailure}
        onClose={handlePaymentClose}
        products={products}
        selectedPlan={selectedPlan}
        offering={offering}
        logEvent={logEvent}
      />

      {/* Sign Up Bottom Sheet */}
      {/* <SignUpBottomSheet
        isVisible={showSignUpSheet}
        onSignUpComplete={handleSignUpComplete}
        onEmailPress={handleEmailPress}
      /> */}
    </View>
  );
}

const createStyles = (R: ReturnType<typeof useResponsive>) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    scrollableSection: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: R.w(4),
    },
    continuationIndicator: {
      alignItems: "center",
      marginBottom: R.h(2),
    },
    progressDots: {
      flexDirection: "row",
      gap: R.w(1.5),
      marginBottom: R.h(0.7),
    },
    dot: {
      width: R.w(1.5),
      height: R.w(1.5),
      borderRadius: R.w(0.75),
      backgroundColor: "rgba(255, 255, 255, 0.3)",
    },
    dotCompleted: {
      backgroundColor: "#4CAF50",
    },
    dotActive: {
      backgroundColor: "#FFD700",
      transform: [{ scale: 1.3 }],
    },
    continuationText: {
      fontSize: R.font(12),
      color: "rgba(255, 255, 255, 0.7)",
      fontWeight: "600",
    },
    header: {
      alignItems: "center",
      marginBottom: R.h(3),
      paddingHorizontal: R.w(4),
    },
    ratingContainer: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: R.h(2),
      paddingHorizontal: R.w(3),
      paddingVertical: R.h(0.8),
      backgroundColor: "rgba(255, 255, 255, 0.1)",
      borderRadius: R.w(5),
    },
    starsContainer: {
      flexDirection: "row",
      marginRight: R.w(2),
    },
    ratingText: {
      fontSize: R.font(13),
      color: "rgba(255, 255, 255, 0.9)",
      fontWeight: "600",
    },
    offerBanner: {
      marginBottom: R.h(2.5),
      paddingHorizontal: R.w(4),
    },
    offerGradient: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: R.h(1),
      paddingHorizontal: R.w(4),
      borderRadius: R.w(2),
      gap: R.w(2),
    },
    offerText: {
      fontSize: R.font(14),
      fontWeight: "700",
      color: "#FFFFFF",
      letterSpacing: -0.2,
    },
    earlyAccessBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: R.w(1.5),
      backgroundColor: "rgba(255, 215, 0, 0.15)",
      paddingHorizontal: R.w(3),
      paddingVertical: R.h(0.5),
      borderRadius: R.w(5),
      marginBottom: R.h(1.5),
      borderWidth: 1,
      borderColor: "rgba(255, 215, 0, 0.3)",
    },
    earlyAccessText: {
      fontSize: R.font(12),
      fontWeight: "700",
      color: "#FFD700",
      letterSpacing: 0.5,
      textTransform: "uppercase",
    },
    title: {
      fontSize: R.font(32),
      fontFamily: "SNPro-Black",
      color: "#FFFFFF",
      textAlign: "center",
      marginBottom: R.h(1.5),
      lineHeight: R.font(36),
      letterSpacing: -0.6,
    
    
    },
    subtitle: {
      fontSize: R.font(18),
      fontFamily: "SNPro-SemiBold",
      color: "rgba(255, 255, 255, 0.8)",
      textAlign: "center",
      lineHeight: R.font(24),
      letterSpacing: -0.2,
    
    
    },

    featuresSection: {
      
      paddingHorizontal: R.w(2),
    },
    benefitRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      marginBottom: R.h(2), // Consistent spacing within the benefits group
      gap: R.w(3),
    },
    iconWrapper: {
      width: R.w(9),
      height: R.w(9),
      borderRadius: R.w(4.5),
      backgroundColor: "rgba(255, 215, 0, 0.12)",
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1.5,
      borderColor: "rgba(255, 215, 0, 0.25)",
    },
    benefitTextContainer: {
      flex: 1,
    },
    benefitTitle: {
      fontSize: R.font(18),
      fontFamily: "SNPro-Heavy",
      color: "#FFFFFF",
      marginBottom: R.h(0.4),
     
      lineHeight: R.font(24),
    },
    benefitDescription: {
      fontSize: R.font(16),
      fontFamily: "SNPro-Regular",
      color: "rgba(255, 255, 255, 0.8)",
      lineHeight: R.font(20),
    
    },
    // Transformation Section
    transformationSection: {
      marginTop: R.h(4),
      marginBottom: R.h(3),
      paddingHorizontal: R.w(2),
    },
    sectionDivider: {
      height: 1,
      backgroundColor: "rgba(255, 255, 255, 0.15)",
      marginBottom: R.h(3),
    },
    transformationTitle: {
      fontSize: R.font(24),
      fontFamily: "SNPro-Black",
      color: "#FFD700",
      textAlign: "center",
      marginBottom: R.h(2),
      lineHeight: R.font(28),
      letterSpacing: -0.3,
    },
    transformationBody: {
      fontSize: R.font(16),
      fontFamily: "SNPro-Regular",
      color: "rgba(255, 255, 255, 0.85)",
      lineHeight: R.font(24),
      marginBottom: R.h(1.5),
      textAlign: "left",
    },
    transformationHighlight: {
      fontFamily: "SNPro-Bold",
      color: "#FFFFFF",
    },
    // Testimonial Section
    testimonialSection: {
      marginTop: R.h(3),
      marginBottom: R.h(3),
    },
    testimonialSectionTitle: {
      fontSize: R.font(22),
      fontFamily: "SNPro-Black",
      color: "#FFFFFF",
      textAlign: "center",
      marginBottom: R.h(2.5),
      lineHeight: R.font(26),
    },
    testimonialCarousel: {
      paddingLeft: R.w(4),
      paddingRight: R.w(4),
    },
    testimonialCard: {
      backgroundColor: "rgba(255, 255, 255, 0.08)",
      borderRadius: R.w(4),
      padding: R.w(4),
      borderWidth: 1,
      borderColor: "rgba(255, 215, 0, 0.2)",
      width: R.w(80),
      marginRight: R.w(3),
    },
    quoteIconContainer: {
      marginBottom: R.h(1),
    },
    testimonialText: {
      fontSize: R.font(15),
      fontFamily: "SNPro-Regular",
      color: "rgba(255, 255, 255, 0.9)",
      lineHeight: R.font(22),
      marginBottom: R.h(1),
      fontStyle: "italic",
    },
    testimonialAuthor: {
      fontSize: R.font(14),
      fontFamily: "SNPro-SemiBold",
      color: "#FFD700",
    },
    paginationDots: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      marginTop: R.h(2),
      gap: R.w(2),
    },
    paginationDot: {
      width: R.w(2),
      height: R.w(2),
      borderRadius: R.w(1),
      backgroundColor: "rgba(255, 255, 255, 0.3)",
    },
    paginationDotActive: {
      backgroundColor: "#FFD700",
      width: R.w(6),
    },
    // Value Section
    valueSection: {
      marginTop: R.h(2),
      marginBottom: R.h(3),
      paddingHorizontal: R.w(2),
    },
    valueSectionTitle: {
      fontSize: R.font(22),
      fontFamily: "SNPro-Black",
      color: "#FFD700",
      textAlign: "center",
      marginBottom: R.h(2),
      lineHeight: R.font(26),
    },
    valueBody: {
      fontSize: R.font(16),
      fontFamily: "SNPro-Regular",
      color: "rgba(255, 255, 255, 0.85)",
      lineHeight: R.font(24),
      marginBottom: R.h(1.5),
      textAlign: "left",
    },
    valuePoint: {
      flexDirection: "row",
      alignItems: "flex-start",
      marginTop: R.h(2),
      gap: R.w(3),
    },
    valuePointText: {
      flex: 1,
    },
    valuePointTitle: {
      fontSize: R.font(17),
      fontFamily: "SNPro-Bold",
      color: "#FFFFFF",
      marginBottom: R.h(0.5),
      lineHeight: R.font(22),
    },
    valuePointDesc: {
      fontSize: R.font(15),
      fontFamily: "SNPro-Regular",
      color: "rgba(255, 255, 255, 0.8)",
      lineHeight: R.font(21),
    },
    valueCallout: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "rgba(255, 215, 0, 0.1)",
      borderRadius: R.w(3),
      padding: R.w(3),
      marginTop: R.h(2.5),
      gap: R.w(2),
      borderWidth: 1,
      borderColor: "rgba(255, 215, 0, 0.3)",
    },
    valueCalloutText: {
      flex: 1,
      fontSize: R.font(15),
      fontFamily: "SNPro-SemiBold",
      color: "#FFD700",
      lineHeight: R.font(21),
    },
    // Journey Section
    journeySection: {
      marginTop: R.h(4),
      marginBottom: R.h(3),
      paddingHorizontal: R.w(2),
    },
    journeySectionTitle: {
      fontSize: R.font(32),
      fontFamily: "SNPro-Black",
      color: "#FFFFFF",
      textAlign: "center",
      marginBottom: R.h(1),
      lineHeight: R.font(36),
    },
    journeySubtitle: {
      fontSize: R.font(16),
      fontFamily: "SNPro-Regular",
      color: "rgba(255, 255, 255, 0.7)",
      textAlign: "center",
      marginBottom: R.h(2.5),
      lineHeight: R.font(20),
      paddingBottom: R.h(2),
    },
    journeyTimeline: {
      paddingLeft: R.w(2),
    },
    journeyMilestone: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: R.w(3),
    },
    milestoneCircle: {
      width: R.w(18),
      height: R.w(18),
      borderRadius: R.w(9),
      backgroundColor: "rgba(255, 255, 255, 0.1)",
      borderWidth: 2,
      borderColor: "rgba(255, 255, 255, 0.3)",
      alignItems: "center",
      justifyContent: "center",
    },
    milestoneCircleGold: {
      backgroundColor: "rgba(255, 215, 0, 0.15)",
      borderColor: "#FFD700",
      borderWidth: 3,
    },
    milestoneDay: {
      fontSize: R.font(13),
      fontFamily: "SNPro-Bold",
      color: "#FFFFFF",
      textAlign: "center",
    },
    milestoneContent: {
      flex: 1,
      paddingBottom: R.h(1),
    },
    milestoneTitle: {
      fontSize: R.font(22),
      fontFamily: "SNPro-Bold",
      color: "#FFFFFF",
      marginBottom: R.h(0.5),
      lineHeight: R.font(26),
    },
    milestoneTitleGold: {
      color: "#FFD700",
    },
    milestoneDesc: {
      fontSize: R.font(16),
      fontFamily: "SNPro-Regular",
      color: "rgba(255, 255, 255, 0.75)",
      lineHeight: R.font(20),
    },
    milestoneLine: {
      width: 2,
      height: R.h(3),
      backgroundColor: "rgba(255, 255, 255, 0.2)",
      marginLeft: R.w(9),
      marginVertical: R.h(0.5),
    },
    // Final Invitation Section
    finalInvitationSection: {
      marginTop: R.h(4),
      marginBottom: R.h(8),
      paddingHorizontal: R.w(2),
      alignItems: "center",
    },
    finalIcon: {
      marginBottom: R.h(2),
    },
    finalTitle: {
      fontSize: R.font(26),
      fontFamily: "SNPro-Black",
      color: "#FFFFFF",
      textAlign: "center",
      marginBottom: R.h(1.5),
      lineHeight: R.font(30),
      letterSpacing: -0.4,
    },
    finalBody: {
      fontSize: R.font(16),
      fontFamily: "SNPro-Regular",
      color: "rgba(255, 255, 255, 0.85)",
      lineHeight: R.font(24),
      marginBottom: R.h(1.5),
      textAlign: "center",
    },
    urgencyBadge: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "rgba(255, 215, 0, 0.15)",
      paddingHorizontal: R.w(4),
      paddingVertical: R.h(1),
      borderRadius: R.w(6),
      marginVertical: R.h(2),
      gap: R.w(2),
      borderWidth: 1.5,
      borderColor: "rgba(255, 215, 0, 0.4)",
    },
    urgencyText: {
      fontSize: R.font(14),
      fontFamily: "SNPro-Bold",
      color: "#FFD700",
      letterSpacing: 0.3,
    },
    finalQuestion: {
      fontSize: R.font(18),
      fontFamily: "SNPro-Bold",
      color: "#FFFFFF",
      textAlign: "center",
      lineHeight: R.font(26),
      marginTop: R.h(1.5),
    },
    featureItem: {
      flexDirection: "row",
      alignItems: "flex-start",
      paddingVertical: R.h(1.8),
      paddingHorizontal: R.w(4),
      backgroundColor: "rgba(255, 255, 255, 0.08)",
      borderRadius: R.w(4),
      marginBottom: R.h(1),
      borderWidth: 1,
      borderColor: "rgba(255, 255, 255, 0.15)",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    featureIconContainer: {
      width: R.w(9),
      height: R.w(9),
      borderRadius: R.w(4.5),
      backgroundColor: "rgba(255, 255, 255, 0.15)",
      alignItems: "center",
      justifyContent: "center",
      marginRight: R.w(3),
      marginTop: R.h(0.2),
    },
    featureContent: {
      flex: 1,
      justifyContent: "center",
    },
    featureTitle: {
      fontSize: R.font(15),
      fontWeight: "700",
      color: "#FFFFFF",
      marginBottom: R.h(0.4),
      letterSpacing: -0.3,
      lineHeight: R.font(20),
    },
    featureDescription: {
      fontSize: R.font(13),
      color: "rgba(255, 255, 255, 0.75)",
      lineHeight: R.font(19),
      letterSpacing: -0.1,
    },
    ctaSection: {
      width: "100%",
    },
    trustIndicators: {
      flexDirection: "row",
      justifyContent: "center",
      gap: R.w(6),
      marginBottom: R.h(2),
    },
    trustItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: R.w(1.5),
    },
    trustText: {
      fontSize: R.font(13),
      color: "rgba(255, 255, 255, 0.8)",
      fontWeight: "600",
    },
    priceDisclaimer: {
      fontSize: R.font(12),
      color: "rgba(255, 255, 255, 0.6)",
      textAlign: "center",
      marginTop: R.h(1),
      fontWeight: "500",
    },
    ctaButton: {
      borderRadius: R.w(3),
      overflow: "hidden",
      marginTop: R.h(0.8),
      marginBottom: R.h(1),
    },
    ctaGradient: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: R.h(1.8),
      gap: R.w(2),
      overflow: "hidden",
    },
    ctaText: {
      fontSize: R.font(18),
      fontWeight: "800",
      color: "#1A1B4B",
    },
    alternativesSection: {
      alignItems: "center",
      width: "100%",
    },
    viewAllPlansButton: {
      paddingVertical: R.h(0.8),
      paddingHorizontal: R.w(4),
      marginBottom: R.h(0.8),
    },
    viewAllPlansText: {
      fontSize: R.font(13),
      fontWeight: "500",
      color: "rgba(255, 255, 255, 0.5)",
      textAlign: "center",
      textDecorationLine: "underline",
      letterSpacing: -0.1,
      marginTop: R.h(1.5),
    },
    fineprintText: {
      fontSize: R.font(14),
      color: "rgba(255, 255, 255, 0.6)",
      textAlign: "center",
      lineHeight: R.font(16),
      paddingHorizontal: R.w(4),
      letterSpacing: -0.1,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: R.w(8),
    },
    loadingText: {
      marginTop: R.h(2),
      fontSize: R.font(16),
      color: "rgba(255, 255, 255, 0.8)",
      fontWeight: "600",
    },
    pricingSection: {
      alignItems: "center",
      marginBottom: R.h(1),
      paddingHorizontal: R.w(4),
    },
    mainOffer: {
      fontSize: R.font(22),
      fontWeight: "800",
      color: "#FFD700",
      textAlign: "center",
      marginBottom: R.h(0.8),
      letterSpacing: -0.5,
      textShadowColor: "rgba(0, 0, 0, 0.3)",
      textShadowOffset: { width: 0, height: 2 },
      textShadowRadius: 4,
    },
    pricingDescription: {
      fontSize: R.font(15),
      fontWeight: "600",
      color: "rgba(255, 255, 255, 0.9)",
      textAlign: "center",
      lineHeight: R.font(20),
      letterSpacing: -0.2,
    },
    restorePurchasesButton: {
      paddingVertical: R.h(0.8),
      paddingHorizontal: R.w(4),
      marginTop: R.h(1.5),
    },
    restorePurchasesText: {
      fontSize: R.font(13),
      fontWeight: "500",
      color: "rgba(255, 255, 255, 0.6)",
      textAlign: "center",
      textDecorationLine: "underline",
      letterSpacing: -0.1,
    },
    planSelectionContainer: {
      marginBottom: R.h(2),
    },
    planOption: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "rgba(255, 255, 255, 0.05)",
      borderRadius: R.w(3),
      borderWidth: 2,
      borderColor: "rgba(255, 255, 255, 0.15)",
      paddingVertical: R.h(1.2),
      paddingHorizontal: R.w(3),
      marginBottom: R.h(0.8),
    },
    planOptionWeekly: {
      marginBottom: R.h(1.5),
    },
    planOptionAnnual: {
      marginBottom: R.h(2),
    },
    planOptionSelected: {
      borderColor: "#FFD700",
      backgroundColor: "rgba(255, 215, 0, 0.1)",
    },
    selectedGlow: {
      position: "absolute" as "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(255, 215, 0, 0.05)",
    },
    planOptionContent: {
      padding: R.w(4),
    },
    planHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: R.h(1.5),
    },
    planContent: {
      alignItems: "flex-start",
    },
    checkCircle: {
      width: R.w(6),
      height: R.w(6),
      borderRadius: R.w(3),
      borderWidth: 2,
      borderColor: "rgba(255, 255, 255, 0.3)",
      alignItems: "center",
      justifyContent: "center",
    },
    checkCircleSelected: {
      backgroundColor: "#4CAF50",
      borderColor: "#4CAF50",
    },
    planRadioContainer: {
      marginRight: R.w(3),
    },
    planRadioOuter: {
      width: R.w(5),
      height: R.w(5),
      borderRadius: R.w(2.5),
      borderWidth: 2,
      borderColor: "rgba(255, 255, 255, 0.4)",
      alignItems: "center",
      justifyContent: "center",
    },
    planRadioOuterSelected: {
      borderColor: "#FFD700",
    },
    planRadioInner: {
      width: R.w(2.5),
      height: R.w(2.5),
      borderRadius: R.w(1.25),
      backgroundColor: "#FFD700",
    },
    planTextContainer: {
      flex: 1,
    },
    planTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: R.h(0.3),
    },
    planTitle: {
      fontSize: R.font(17),
      fontWeight: "700",
      color: "rgba(255, 255, 255, 0.7)",
      marginBottom: R.h(0.5),
    },
    planTitleSelected: {
      color: "#FFFFFF",
    },
    savingsBadge: {
      backgroundColor: "#FFD700",
      paddingHorizontal: R.w(2),
      paddingVertical: R.h(0.3),
      borderRadius: R.w(1),
    },
    savingsBadgeText: {
      fontSize: R.font(10),
      fontWeight: "800",
      color: "#1A1B4B",
      letterSpacing: 0.5,
    },
    popularBadge: {
      backgroundColor: "#FF6B6B",
      paddingHorizontal: R.w(2),
      paddingVertical: R.h(0.3),
      borderRadius: R.w(1),
    },
    popularBadgeText: {
      fontSize: R.font(10),
      fontWeight: "800",
      color: "#FFFFFF",
      letterSpacing: 0.5,
    },
    planPrice: {
      fontSize: R.font(28),
      fontWeight: "800",
      color: "rgba(255, 255, 255, 0.9)",
      marginBottom: R.h(0.1),
      letterSpacing: -0.5,
    },
    planPeriod: {
      fontSize: R.font(14),
      color: "rgba(255, 255, 255, 0.6)",
      marginBottom: R.h(0.8),
    },
    planPeriodSelected: {
      color: "rgba(255, 255, 255, 0.8)",
    },
    annualPriceContainer: {
      flexDirection: "row",
      alignItems: "baseline",
      gap: R.w(2),
    },
    strikethroughPrice: {
      fontSize: R.font(16),
      color: "rgba(255, 255, 255, 0.4)",
      textDecorationLine: "line-through",
      fontWeight: "600",
    },
    planPriceSelected: {
      color: "#FFD700",
    },
    planSubtext: {
      fontSize: R.font(13),
      color: "rgba(255, 255, 255, 0.6)",
    },
    planSubtextSelected: {
      color: "rgba(255, 255, 255, 0.8)",
    },
    planEquivalent: {
      fontSize: R.font(12),
      color: "rgba(255, 255, 255, 0.5)",
      marginLeft: R.w(2),
    },
    planEquivalentSelected: {
      color: "rgba(255, 255, 255, 0.7)",
    },
    fixedBottomSection: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: "rgba(26, 27, 75, 0.98)",
      paddingTop: R.h(1.5),
      paddingHorizontal: R.w(4),
      borderTopWidth: 1,
      borderTopColor: "rgba(255, 255, 255, 0.15)",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 15,
    },
    bottomLinks: {
      flexDirection: "row",
      justifyContent: "center",
      gap: R.w(4),
      marginTop: R.h(1),
      marginBottom: R.h(1),
    },
    linkText: {
      fontSize: R.font(14),
      color: "rgba(255, 255, 255, 0.5)",
      fontWeight: "500",
      textDecorationLine: "underline",
    },
    // New styles for redesigned bottom section
    planCard: {
      backgroundColor: "transparent",
      borderRadius: R.w(3),
      borderWidth: 2,
      borderColor: "rgba(255, 255, 255, 0.2)",
      paddingVertical: R.h(1),
      paddingHorizontal: R.w(4),
      position: "relative" as "relative",
    },
    planCardSelected: {
      borderColor: "#4CAF50",
      backgroundColor: "rgba(76, 175, 80, 0.1)",
    },
    ctaContent: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: R.w(2),
    },
    trustBadge: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: R.w(1.5),
      marginBottom: R.h(0.5),
    },
    footerLinks: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      marginTop: R.h(1),
      marginBottom: R.h(0.5),
    },
    footerLink: {
      fontSize: R.font(11),
      color: "rgba(255, 255, 255, 0.5)",
      textDecorationLine: "underline",
    },
    footerDivider: {
      fontSize: R.font(11),
      color: "rgba(255, 255, 255, 0.3)",
      marginHorizontal: R.w(2),
    },
    // Toggle styles
    toggleRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: R.h(1.5),
    },
    toggleLabel: {
      fontSize: R.font(16),
      fontWeight: "600",
      color: "#FFFFFF",
    },
    toggleSwitch: {
      width: R.w(14),
      height: R.h(3.5),
      backgroundColor: "rgba(255, 255, 255, 0.2)",
      borderRadius: R.h(1.75),
      padding: R.w(0.5),
      justifyContent: "center",
    },
    toggleSwitchActive: {
      backgroundColor: "#4CAF50",
    },
    toggleThumb: {
      width: R.h(2.5),
      height: R.h(2.5),
      backgroundColor: "#FFFFFF",
      borderRadius: R.h(1.25),
    },
    toggleThumbActive: {
      transform: [{ translateX: R.w(7) }],
    },
    // Plan text styles
    planMainText: {
      fontSize: R.font(14),
      fontWeight: "700",
      color: "#FFFFFF",
      letterSpacing: 0.3,
    },
    planDescText: {
      fontSize: R.font(13),
      color: "#FFFFFF",
      fontWeight: "700",
      marginTop: R.h(0.2),
    },
    planPriceContainer: {
      alignItems: "flex-end",
    },
    planPriceAmount: {
      fontSize: R.font(16),
      fontWeight: "600",
      color: "#FFFFFF",
    },
    planPriceUnit: {
      fontSize: R.font(12),
      color: "rgba(255, 255, 255, 0.7)",
    },
    planBadgePositioner: {
      position: "absolute" as "absolute",
      top: -R.h(1.2),
      right: R.w(2),
    },
    planBadge: {
      backgroundColor: "#FFD700",
      paddingHorizontal: R.w(2.5),
      paddingVertical: R.h(0.4),
      borderRadius: R.w(1),
    },
    planBadgeText: {
      fontSize: R.font(10),
      fontWeight: "800",
      color: "#1A1B4B",
      letterSpacing: 0.5,
    },
    noThanksText: {
      fontSize: R.font(14),
      color: "rgba(255, 255, 255, 0.7)",
      textAlign: "center",
      textDecorationLine: "underline",
      marginBottom: R.h(0.5),
      marginTop: R.h(1),
    },
    shimmerOverlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      borderRadius: R.w(4),
    },
    shimmerGradient: {
      flex: 1,
      borderRadius: R.w(4),
    },
  });
