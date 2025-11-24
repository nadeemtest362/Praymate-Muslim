import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Avatar } from '../../shared/ui';
import { IntentionItem } from './IntentionItem';
import { PersonGroupType } from './types';
import useResponsive from '../../hooks/useResponsive';
import { useAuth } from '../../hooks/useAuth';
import { queryClient, queryKeys } from '../../lib/queryClient';
import { intentionsRepository } from '../../repositories/intentionsRepository';

interface PersonGroupProps {
  group: PersonGroupType;
  onAddIntention: (personId?: string) => void;
  onEditIntention: (intentionId: string) => void;
  onToggleActive: (intentionId: string) => void;
  onDeleteIntention: (intentionId: string) => void;
}

export const PersonGroup: React.FC<PersonGroupProps> = ({
  group,
  onAddIntention,
  onEditIntention,
  onToggleActive,
  onDeleteIntention,
}) => {
  const router = useRouter();
  const R = useResponsive();
  const styles = useMemo(() => createStyles(R), [R]);
  const { user } = useAuth();
  const activeCount = group.intentions.filter(i => i.is_active).length;
  const hasOnlyInactive = activeCount === 0;

  const handleContactPress = () => {
    // Don't navigate for self
    if (group.id === 'self') return;
    
    // Get relationship from first intention if available
    const relationship = group.intentions.length > 0 ? group.intentions[0].person?.relationship : null;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (user?.id) {
      const key = queryKeys.intentionsByPerson(user.id, group.id);
      if (!queryClient.getQueryData(key)) {
        queryClient
          .prefetchQuery({
            queryKey: key,
            queryFn: () => intentionsRepository.getIntentionsByPersonId(user.id!, group.id),
          })
          .catch(() => {});
      }
    }

    router.push({
      pathname: '/contact-detail',
      params: {
        personId: group.id,
        name: group.name,
        image_uri: group.avatar || '',
        relationship: relationship || '',
      }
    });
  };

  return (
    <View style={[styles.group, hasOnlyInactive && styles.groupInactive]}>
      <View style={styles.groupHeader}>
        <TouchableOpacity 
          onPress={handleContactPress}
          style={styles.contactButton}
          disabled={group.id === 'self'}
        >
          <Avatar size={R.w(7)} image_uri={group.avatar} name={group.name} />
          <View style={styles.groupText}>
            <Text style={[styles.groupName, hasOnlyInactive && styles.groupNameInactive]}>{group.name}</Text>
            <Text style={[styles.groupCount, hasOnlyInactive && styles.groupCountInactive]}>
              {activeCount} active
            </Text>
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity 
          onPress={() => {
            onAddIntention(group.id === 'self' ? undefined : group.id);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
          style={styles.addButton}
        >
          <Ionicons name="add" size={R.font(20)} color="rgba(255, 255, 255, 0.7)" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.intentionsList}>
        {group.intentions.map(intention => (
          <IntentionItem
            key={intention.id}
            intention={intention}
            onEdit={onEditIntention}
            onToggleActive={onToggleActive}
            onDelete={onDeleteIntention}
          />
        ))}
      </View>
    </View>
  );
};

const createStyles = (R: ReturnType<typeof useResponsive>) => StyleSheet.create({
  group: {
    marginBottom: R.h(1.5),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: R.w(5),
    padding: R.w(2),
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  groupInactive: {
    opacity: 0.7,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: R.h(1),
    paddingHorizontal: R.w(1),
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingVertical: R.h(0.25),
    paddingHorizontal: R.w(1),
    borderRadius: R.w(2),
  },
  groupText: {
    flex: 1,
    marginLeft: R.w(2),
  },
  groupName: {
    fontSize: R.font(18),
    fontFamily: 'SNPro-Heavy',
    color: '#FFFFFF',
    marginBottom: R.h(0.25),
  },
  groupNameInactive: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  groupCount: {
    fontSize: R.font(14),
    color: 'rgba(255,255,255,0.6)',
    fontFamily: 'SNPro-Regular',
  },
  groupCountInactive: {
    color: 'rgba(255, 255, 255, 0.4)',
  },
  addButton: {
    width: R.w(8),
    height: R.w(8),
    alignItems: 'center',
    justifyContent: 'center',
  },
  intentionsList: {
    gap: R.h(1),
  },
}); 