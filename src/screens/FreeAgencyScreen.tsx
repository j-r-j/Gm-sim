/**
 * FreeAgencyScreen
 * Browse and sign free agents
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SafeAreaView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../styles';
import { Position } from '../core/models/player/Position';
import { Player } from '../core/models/player/Player';
import { Avatar } from '../components/avatar';
import { PlayerDetailCard } from '../components/player/PlayerDetailCard';

/**
 * Free agent for display
 */
export interface FreeAgent {
  id: string;
  firstName: string;
  lastName: string;
  position: Position;
  age: number;
  experience: number;
  estimatedValue: number; // Expected annual salary
  skills: Record<string, { perceivedMin: number; perceivedMax: number }>;
}

/**
 * Contract offer structure
 */
export interface ContractOffer {
  years: number;
  annualSalary: number;
  guaranteed: number;
}

/**
 * Props for FreeAgencyScreen
 */
export interface FreeAgencyScreenProps {
  /** Available free agents */
  freeAgents: FreeAgent[];
  /** Full player data for detailed view (keyed by player ID) */
  freeAgentPlayers?: Record<string, Player>;
  /** Current cap space */
  capSpace: number;
  /** User's team name */
  teamName: string;
  /** Callback to make an offer */
  onMakeOffer: (
    playerId: string,
    offer: ContractOffer
  ) => Promise<'accepted' | 'rejected' | 'counter'>;
  /** Callback to go back */
  onBack: () => void;
}

type PositionFilter = 'all' | Position;
type SortOption = 'value' | 'age' | 'position';

/**
 * Format currency
 */
function formatMoney(amount: number): string {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`;
  }
  return `$${(amount / 1000).toFixed(0)}K`;
}

/**
 * Free agent card component
 */
function FreeAgentCard({
  agent,
  onPress,
  onMakeOffer,
}: {
  agent: FreeAgent;
  onPress: () => void;
  onMakeOffer: () => void;
}) {
  return (
    <View style={styles.agentCard}>
      <TouchableOpacity style={styles.agentTappableArea} onPress={onPress}>
        <View style={styles.agentHeader}>
          <View style={styles.avatarContainer}>
            <Avatar id={agent.id} size="sm" age={agent.age} context="player" />
            <View style={styles.positionBadge}>
              <Text style={styles.positionText}>{agent.position}</Text>
            </View>
          </View>
          <View style={styles.agentInfo}>
            <Text style={styles.agentName}>
              {agent.firstName} {agent.lastName}
            </Text>
            <Text style={styles.agentDetails}>
              Age {agent.age} • {agent.experience} yrs exp
            </Text>
          </View>
          <View style={styles.valueContainer}>
            <Text style={styles.valueLabel}>Est. Value</Text>
            <Text style={styles.valueAmount}>{formatMoney(agent.estimatedValue)}</Text>
            <Text style={styles.tapHint}>Tap for details</Text>
          </View>
        </View>
      </TouchableOpacity>
      <TouchableOpacity style={styles.offerButton} onPress={onMakeOffer}>
        <Text style={styles.offerButtonText}>Make Offer</Text>
      </TouchableOpacity>
    </View>
  );
}

/**
 * Contract offer modal
 */
function OfferModal({
  visible,
  agent,
  capSpace,
  onSubmit,
  onClose,
}: {
  visible: boolean;
  agent: FreeAgent | null;
  capSpace: number;
  onSubmit: (offer: ContractOffer) => void;
  onClose: () => void;
}) {
  const [years, setYears] = useState('3');
  const [salary, setSalary] = useState('');
  const [guaranteed, setGuaranteed] = useState('');

  const salaryNum = parseFloat(salary) || 0;
  const guaranteedNum = parseFloat(guaranteed) || 0;
  const yearsNum = parseInt(years, 10) || 1;
  const totalValue = salaryNum * yearsNum * 1000000;

  const handleSubmit = () => {
    if (salaryNum <= 0) {
      Alert.alert('Invalid Offer', 'Please enter a valid salary amount');
      return;
    }
    if (salaryNum * 1000000 > capSpace) {
      Alert.alert('Insufficient Cap Space', 'You cannot afford this contract');
      return;
    }
    onSubmit({
      years: yearsNum,
      annualSalary: salaryNum * 1000000,
      guaranteed: guaranteedNum * 1000000,
    });
  };

  if (!agent) return null;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                Contract Offer for {agent.firstName} {agent.lastName}
              </Text>

              <View style={styles.modalRow}>
                <Text style={styles.modalLabel}>Estimated Value:</Text>
                <Text style={styles.modalValue}>{formatMoney(agent.estimatedValue)}/yr</Text>
              </View>

              <View style={styles.modalRow}>
                <Text style={styles.modalLabel}>Your Cap Space:</Text>
                <Text style={styles.modalValue}>{formatMoney(capSpace)}</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Years (1-5)</Text>
                <View style={styles.yearsContainer}>
                  {[1, 2, 3, 4, 5].map((y) => (
                    <TouchableOpacity
                      key={y}
                      style={[styles.yearButton, years === String(y) && styles.yearButtonActive]}
                      onPress={() => setYears(String(y))}
                    >
                      <Text
                        style={[
                          styles.yearButtonText,
                          years === String(y) && styles.yearButtonTextActive,
                        ]}
                      >
                        {y}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Annual Salary ($M)</Text>
                <TextInput
                  style={styles.textInput}
                  value={salary}
                  onChangeText={setSalary}
                  placeholder={`e.g., ${(agent.estimatedValue / 1000000).toFixed(1)}`}
                  keyboardType="decimal-pad"
                  placeholderTextColor={colors.textLight}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Guaranteed ($M)</Text>
                <TextInput
                  style={styles.textInput}
                  value={guaranteed}
                  onChangeText={setGuaranteed}
                  placeholder="e.g., 10"
                  keyboardType="decimal-pad"
                  placeholderTextColor={colors.textLight}
                />
              </View>

              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total Contract Value:</Text>
                <Text style={styles.totalValue}>{formatMoney(totalValue)}</Text>
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
                  <Text style={styles.submitButtonText}>Submit Offer</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

/**
 * FreeAgencyScreen Component
 */
export function FreeAgencyScreen({
  freeAgents,
  freeAgentPlayers,
  capSpace,
  teamName,
  onMakeOffer,
  onBack,
}: FreeAgencyScreenProps): React.JSX.Element {
  const [positionFilter, setPositionFilter] = useState<PositionFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('value');
  const [selectedAgent, setSelectedAgent] = useState<FreeAgent | null>(null);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [showPlayerCard, setShowPlayerCard] = useState(false);

  // Filter and sort agents
  const filteredAgents = useMemo(() => {
    let result = [...freeAgents];

    // Apply position filter
    if (positionFilter !== 'all') {
      result = result.filter((a) => a.position === positionFilter);
    }

    // Apply sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'value':
          return b.estimatedValue - a.estimatedValue;
        case 'age':
          return a.age - b.age;
        case 'position':
          return a.position.localeCompare(b.position);
        default:
          return 0;
      }
    });

    return result;
  }, [freeAgents, positionFilter, sortBy]);

  const handleMakeOffer = async (offer: ContractOffer) => {
    if (!selectedAgent) return;

    const result = await onMakeOffer(selectedAgent.id, offer);
    setShowOfferModal(false);
    setSelectedAgent(null);

    switch (result) {
      case 'accepted':
        Alert.alert(
          'Offer Accepted!',
          `${selectedAgent.firstName} ${selectedAgent.lastName} has signed with ${teamName}!`
        );
        break;
      case 'rejected':
        Alert.alert(
          'Offer Rejected',
          `${selectedAgent.firstName} ${selectedAgent.lastName} has declined your offer.`
        );
        break;
      case 'counter':
        Alert.alert(
          'Counter Offer',
          `${selectedAgent.firstName} ${selectedAgent.lastName} wants more money.`
        );
        break;
    }
  };

  const positionGroups = ['all', 'QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'CB', 'S'];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Free Agency</Text>
        <View style={styles.capBadge}>
          <Text style={styles.capLabel}>Cap Space</Text>
          <Text style={styles.capValue}>{formatMoney(capSpace)}</Text>
        </View>
      </View>

      {/* Position Filters */}
      <View style={styles.filterContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={positionGroups}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.filterChip, positionFilter === item && styles.filterChipActive]}
              onPress={() => setPositionFilter(item as PositionFilter)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  positionFilter === item && styles.filterChipTextActive,
                ]}
              >
                {item === 'all' ? 'All' : item}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Sort Options */}
      <View style={styles.sortContainer}>
        <Text style={styles.sortLabel}>Sort by:</Text>
        {(['value', 'age', 'position'] as SortOption[]).map((option) => (
          <TouchableOpacity
            key={option}
            style={[styles.sortOption, sortBy === option && styles.sortOptionActive]}
            onPress={() => setSortBy(option)}
          >
            <Text style={[styles.sortOptionText, sortBy === option && styles.sortOptionTextActive]}>
              {option.charAt(0).toUpperCase() + option.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Agent List */}
      <FlatList
        data={filteredAgents}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <FreeAgentCard
            agent={item}
            onPress={() => {
              setSelectedAgent(item);
              setShowPlayerCard(true);
            }}
            onMakeOffer={() => {
              setSelectedAgent(item);
              setShowOfferModal(true);
            }}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No free agents available</Text>
          </View>
        }
      />

      {/* Offer Modal */}
      <OfferModal
        visible={showOfferModal}
        agent={selectedAgent}
        capSpace={capSpace}
        onSubmit={handleMakeOffer}
        onClose={() => {
          setShowOfferModal(false);
          setSelectedAgent(null);
        }}
      />

      {/* Player Detail Card Modal */}
      {showPlayerCard && selectedAgent && freeAgentPlayers?.[selectedAgent.id] && (
        <PlayerDetailCard
          player={freeAgentPlayers[selectedAgent.id]}
          isModal={true}
          onClose={() => {
            setShowPlayerCard(false);
            setSelectedAgent(null);
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    backgroundColor: colors.primary,
  },
  backButton: {
    padding: spacing.sm,
  },
  backButtonText: {
    color: colors.textOnPrimary,
    fontSize: fontSize.md,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.textOnPrimary,
  },
  capBadge: {
    backgroundColor: colors.primaryLight,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  capLabel: {
    fontSize: fontSize.xs,
    color: colors.textOnPrimary,
    opacity: 0.8,
  },
  capValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.textOnPrimary,
  },
  filterContainer: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
  },
  filterChipText: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  filterChipTextActive: {
    color: colors.textOnPrimary,
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.surface,
  },
  sortLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginRight: spacing.sm,
  },
  sortOption: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginRight: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  sortOptionActive: {
    backgroundColor: colors.primaryLight,
  },
  sortOptionText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  sortOptionTextActive: {
    color: colors.textOnPrimary,
  },
  listContent: {
    padding: spacing.md,
  },
  agentCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  agentTappableArea: {
    marginBottom: spacing.sm,
  },
  agentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: spacing.md,
  },
  positionBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    minWidth: 22,
    height: 16,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xxs,
  },
  positionText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.textOnPrimary,
  },
  agentInfo: {
    flex: 1,
  },
  agentName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  agentDetails: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  valueContainer: {
    alignItems: 'flex-end',
  },
  valueLabel: {
    fontSize: fontSize.xs,
    color: colors.textLight,
  },
  valueAmount: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.secondary,
  },
  tapHint: {
    fontSize: fontSize.xs,
    color: colors.textLight,
    marginTop: spacing.xxs,
  },
  offerButton: {
    backgroundColor: colors.secondary,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  offerButtonText: {
    color: colors.textOnPrimary,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  emptyContainer: {
    padding: spacing.xxl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  modalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  modalLabel: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  modalValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  inputGroup: {
    marginTop: spacing.md,
  },
  inputLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  yearsContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  yearButton: {
    flex: 1,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background,
    alignItems: 'center',
  },
  yearButtonActive: {
    backgroundColor: colors.primary,
  },
  yearButtonText: {
    fontSize: fontSize.md,
    color: colors.text,
  },
  yearButtonTextActive: {
    color: colors.textOnPrimary,
  },
  textInput: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  totalLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  totalValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.secondary,
  },
  modalButtons: {
    flexDirection: 'row',
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  cancelButton: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  submitButton: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.secondary,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textOnPrimary,
  },
});
