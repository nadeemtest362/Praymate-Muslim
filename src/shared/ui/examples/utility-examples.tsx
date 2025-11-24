import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
  AnimatedBackground,
  Badge,
  LinearProgress,
  CircularProgress,
  ProgressRing,
  Tooltip,
  HelpTooltip,
} from '../';
import { Button } from '../core/Button';

export function UtilityExamples() {
  const insets = useSafeAreaInsets();
  const [progress, setProgress] = useState(0);

  // Simulate progress
  React.useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) return 0;
        return prev + 10;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <AnimatedBackground animate={true}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Utility Components</Text>

        {/* Badges Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Badges</Text>
          
          <View style={styles.row}>
            <Badge variant="default">Default</Badge>
            <Badge variant="primary">Primary</Badge>
            <Badge variant="success">Success</Badge>
          </View>
          
          <View style={styles.row}>
            <Badge variant="warning">Warning</Badge>
            <Badge variant="error">Error</Badge>
            <Badge variant="info">Info</Badge>
          </View>
          
          <View style={styles.row}>
            <Badge size="small">Small</Badge>
            <Badge size="medium">Medium</Badge>
            <Badge size="large">Large</Badge>
          </View>
          
          <View style={styles.row}>
            <Badge dot variant="primary">With Dot</Badge>
            <Badge variant="success">42</Badge>
            <Badge variant="error" style={{ paddingHorizontal: 20 }}>Custom Style</Badge>
          </View>
        </View>

        {/* Progress Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Progress Indicators</Text>
          
          <Text style={styles.subsectionTitle}>Linear Progress</Text>
          <LinearProgress value={progress} />
          
          <View style={{ marginTop: 10 }}>
            <LinearProgress 
              value={progress} 
              height={8}
              showPercentage
              progressColor="#7C71E0"
            />
          </View>
          
          <Text style={[styles.subsectionTitle, { marginTop: 20 }]}>
            Circular Progress
          </Text>
          <View style={styles.row}>
            <CircularProgress 
              value={progress} 
              size={80}
              strokeWidth={6}
            />
            <CircularProgress 
              value={progress} 
              size={100}
              strokeWidth={8}
              progressColor="#4CAF50"
              centerContent={
                <View>
                  <Text style={styles.progressText}>{progress}%</Text>
                  <Text style={styles.progressLabel}>Complete</Text>
                </View>
              }
            />
            <ProgressRing value={progress / 100} size={40} />
          </View>
        </View>

        {/* Tooltips Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tooltips</Text>
          
          <View style={styles.row}>
            <View style={styles.tooltipItem}>
              <Text style={styles.label}>Help Icon</Text>
              <HelpTooltip text="This is a helpful tooltip explaining something important about this feature." />
            </View>
            
            <View style={styles.tooltipItem}>
              <Text style={styles.label}>Custom Trigger</Text>
              <Tooltip 
                content="Long press me!"
                trigger="longPress"
                showHelpIcon={false}
              >
                <Badge variant="info">Long Press</Badge>
              </Tooltip>
            </View>
          </View>
          
          <View style={[styles.row, { marginTop: 20 }]}>
            <Tooltip
              content={
                <View>
                  <Text style={styles.tooltipTitle}>Custom Content</Text>
                  <Text style={styles.tooltipText}>
                    You can put any React component here!
                  </Text>
                  <Badge variant="success" size="small" style={{ marginTop: 8 }}>
                    Even badges!
                  </Badge>
                </View>
              }
              placement="bottom"
              maxWidth={300}
            >
              <Button variant="secondary" size="small">
                Custom Tooltip
              </Button>
            </Tooltip>
          </View>
        </View>

        {/* Animated Background Demo */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Animated Background</Text>
          <Text style={styles.description}>
            The entire screen is using AnimatedBackground with subtle movement.
            You can customize colors, animation duration, and disable animation.
          </Text>
          
          <View style={styles.backgroundDemo}>
            <AnimatedBackground
              colors={['#5E55D1', '#7C71E0', '#9866C5']}
              animate={true}
              duration={8000}
              style={styles.miniBackground}
            >
              <View style={styles.miniContent}>
                <Text style={styles.miniText}>Custom Colors</Text>
              </View>
            </AnimatedBackground>
          </View>
        </View>
      </ScrollView>
    </AnimatedBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 30,
    textAlign: 'center',
  },
  section: {
    marginBottom: 40,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 20,
  },
  subsectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 15,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 12,
    marginBottom: 15,
  },
  description: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 22,
    marginBottom: 20,
  },
  tooltipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  label: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  progressText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  progressLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },
  tooltipTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  tooltipText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 20,
  },
  backgroundDemo: {
    height: 150,
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 10,
  },
  miniBackground: {
    flex: 1,
  },
  miniContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
}); 