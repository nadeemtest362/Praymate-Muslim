import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';

import useResponsive from '../../hooks/useResponsive';

interface Metric {
  number: number;
  label: string;
}

interface MetricsCardProps {
  metrics: Metric[];
}

export default function MetricsCard({ metrics }: MetricsCardProps) {
  const R = useResponsive();
  const styles = useMemo(() => createStyles(R), [R]);

  return (
    <View style={styles.container}>
      {metrics.map((metric, index) => (
        <React.Fragment key={metric.label}>
          {index > 0 && <View style={styles.metricDivider} />}
          <View style={styles.metric}>
            <Text style={styles.metricNumber}>{metric.number}</Text>
            <Text style={styles.metricLabel}>{metric.label}</Text>
          </View>
        </React.Fragment>
      ))}
    </View>
  );
}

const createStyles = (R: ReturnType<typeof useResponsive>) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: R.w(4),
    padding: R.w(4),
  },
  metric: {
    flex: 1,
    alignItems: 'center',
  },
  metricNumber: {
    fontSize: R.font(48),
    fontFamily: "SNPro-Black",
    color: '#FFFFFF',
    
    marginBottom: R.h(1),
  },
  metricLabel: {
    fontSize: R.font(12),
    color: 'rgba(255, 255, 255, 0.6)',
    fontFamily: "SNPro-Bold",
    textAlign: 'center',
    lineHeight: R.font(16),
  },
  metricDivider: {
    width: R.w(0.5),
    height: R.h(8),
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: R.w(5),
  },
}); 