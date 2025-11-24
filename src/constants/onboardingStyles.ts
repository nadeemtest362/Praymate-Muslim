import { StyleSheet } from 'react-native';
import useResponsive from '../hooks/useResponsive';

export const createOnboardingOptionStyles = (R: ReturnType<typeof useResponsive>) => StyleSheet.create({
  optionsContainer: {
    width: '100%',
    marginTop: R.h(0.5),
  },
  option: {
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    borderRadius: R.w(3),
    paddingVertical: R.h(1.5),
    paddingHorizontal: R.w(6),
    marginBottom: R.h(1.5),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: R.lineHeight(20) * 2 + R.h(3),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  selectedOption: {
    backgroundColor: 'rgba(108, 99, 255, 0.45)',
    borderColor: '#6C63FF',
    borderWidth: 2,
    transform: [{ scale: 1.02 }],
  },
  optionEmoji: {
    fontSize: R.font(28),
    marginRight: R.w(4),
  },
  optionText: {
    fontSize: R.font(18),
    
    fontFamily: 'SNPro-SemiBold',
    color: 'rgba(255, 255, 255, 0.95)',
  
    lineHeight: R.lineHeight(20),
    marginRight: R.w(3),
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    includeFontPadding: false,
    textAlignVertical: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  selectedOptionText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  optionWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

// Universal question text styles
export const createOnboardingQuestionStyles = (R: ReturnType<typeof useResponsive>) => StyleSheet.create({
  questionContainer: {
    alignItems: 'center',
    marginBottom: R.h(2),
  },
  questionText: {
    fontSize: R.font(32),
    fontFamily: 'SNPro-Heavy',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: R.lineHeight(32),
    letterSpacing: -1.2,
    marginTop: R.h(1),
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  subtitleText: {
    fontSize: R.font(18),
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
    marginTop: R.h(1.5),
    paddingHorizontal: R.w(5),
    lineHeight: R.lineHeight(18),
  },
}); 