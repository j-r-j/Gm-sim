/**
 * TeamSelectionScreen
 * Select a team to manage in your GM career
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import {
  colors,
  spacing,
  fontSize,
  fontWeight,
  borderRadius,
  shadows,
  accessibility,
} from '../styles';
import { ScreenHeader } from '../components';
import {
  FAKE_CITIES,
  FakeCity,
  Conference,
  Division,
  ALL_CONFERENCES,
  ALL_DIVISIONS,
  getFullTeamName,
} from '../core/models/team/FakeCities';
import { SaveSlot } from '../services/storage/GameStorage';

interface TeamSelectionScreenProps {
  onSelectTeam: (team: FakeCity, gmName: string, saveSlot: SaveSlot) => void;
  onBack: () => void;
}

type ViewMode = 'conference' | 'all';

export function TeamSelectionScreen({
  onSelectTeam,
  onBack,
}: TeamSelectionScreenProps): React.JSX.Element {
  const [selectedTeam, setSelectedTeam] = useState<FakeCity | null>(null);
  const [gmName, setGmName] = useState('');
  const [saveSlot, setSaveSlot] = useState<SaveSlot>(0);
  const [viewMode, setViewMode] = useState<ViewMode>('conference');
  const [expandedDivisions, setExpandedDivisions] = useState<string[]>(['AFC-East']);

  const getTeamsByDivision = (conference: Conference, division: Division): FakeCity[] => {
    return FAKE_CITIES.filter(
      (city) => city.conference === conference && city.division === division
    );
  };

  const toggleDivision = (key: string) => {
    setExpandedDivisions((prev: string[]) =>
      prev.includes(key) ? prev.filter((k: string) => k !== key) : [...prev, key]
    );
  };

  const handleConfirm = () => {
    if (selectedTeam && gmName.trim()) {
      onSelectTeam(selectedTeam, gmName.trim(), saveSlot);
    }
  };

  const renderTeamCard = (team: FakeCity) => {
    const isSelected = selectedTeam?.abbreviation === team.abbreviation;

    return (
      <TouchableOpacity
        key={team.abbreviation}
        style={[styles.teamCard, isSelected && styles.teamCardSelected]}
        onPress={() => setSelectedTeam(team)}
        activeOpacity={0.7}
      >
        <View style={styles.teamCardContent}>
          <Text style={[styles.teamAbbr, isSelected && styles.teamAbbrSelected]}>
            {team.abbreviation}
          </Text>
          <View style={styles.teamInfo}>
            <Text style={[styles.teamName, isSelected && styles.teamNameSelected]}>
              {getFullTeamName(team)}
            </Text>
            <Text style={[styles.teamMeta, isSelected && styles.teamMetaSelected]}>
              {team.marketSize.charAt(0).toUpperCase() + team.marketSize.slice(1)} Market
            </Text>
          </View>
        </View>
        {isSelected && (
          <View style={styles.checkmark}>
            <Text style={styles.checkmarkText}>✓</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderConferenceView = () => {
    return (
      <>
        {ALL_CONFERENCES.map((conference) => (
          <View key={conference} style={styles.conferenceSection}>
            <Text style={styles.conferenceHeader}>{conference}</Text>
            {ALL_DIVISIONS.map((division) => {
              const divKey = `${conference}-${division}`;
              const isExpanded = expandedDivisions.includes(divKey);
              const teams = getTeamsByDivision(conference, division);

              return (
                <View key={divKey} style={styles.divisionSection}>
                  <TouchableOpacity
                    style={styles.divisionHeader}
                    onPress={() => toggleDivision(divKey)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.divisionTitle}>
                      {conference} {division}
                    </Text>
                    <Text style={styles.expandIcon}>{isExpanded ? '−' : '+'}</Text>
                  </TouchableOpacity>

                  {isExpanded && (
                    <View style={styles.teamsContainer}>{teams.map(renderTeamCard)}</View>
                  )}
                </View>
              );
            })}
          </View>
        ))}
      </>
    );
  };

  const renderAllTeamsView = () => {
    const sortedTeams = [...FAKE_CITIES].sort((a, b) =>
      getFullTeamName(a).localeCompare(getFullTeamName(b))
    );

    return <View style={styles.allTeamsGrid}>{sortedTeams.map(renderTeamCard)}</View>;
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <ScreenHeader title="Select Your Team" onBack={onBack} testID="team-selection-header" />

      {/* View Mode Toggle */}
      <View style={styles.viewModeContainer}>
        <TouchableOpacity
          style={[styles.viewModeButton, viewMode === 'conference' && styles.viewModeButtonActive]}
          onPress={() => setViewMode('conference')}
        >
          <Text
            style={[styles.viewModeText, viewMode === 'conference' && styles.viewModeTextActive]}
          >
            By Division
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.viewModeButton, viewMode === 'all' && styles.viewModeButtonActive]}
          onPress={() => setViewMode('all')}
        >
          <Text style={[styles.viewModeText, viewMode === 'all' && styles.viewModeTextActive]}>
            All Teams
          </Text>
        </TouchableOpacity>
      </View>

      {/* Teams List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        onScrollBeginDrag={Keyboard.dismiss}
      >
        {viewMode === 'conference' ? renderConferenceView() : renderAllTeamsView()}
      </ScrollView>

      {/* Bottom Panel - GM Name & Confirm */}
      {selectedTeam && (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.bottomPanel}>
            <View style={styles.selectedTeamBanner}>
              <Text style={styles.selectedTeamLabel}>Selected Team</Text>
              <Text style={styles.selectedTeamName}>{getFullTeamName(selectedTeam)}</Text>
            </View>

            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Your Name</Text>
              <TextInput
                style={styles.textInput}
                value={gmName}
                onChangeText={setGmName}
                placeholder="Enter your GM name"
                placeholderTextColor={colors.textLight}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.saveSlotSection}>
              <Text style={styles.inputLabel}>Save Slot</Text>
              <View style={styles.saveSlotButtons}>
                {([0, 1, 2] as SaveSlot[]).map((slot) => (
                  <TouchableOpacity
                    key={slot}
                    style={[
                      styles.saveSlotButton,
                      saveSlot === slot && styles.saveSlotButtonActive,
                    ]}
                    onPress={() => setSaveSlot(slot)}
                  >
                    <Text
                      style={[styles.saveSlotText, saveSlot === slot && styles.saveSlotTextActive]}
                    >
                      {slot + 1}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity
              style={[styles.confirmButton, !gmName.trim() && styles.confirmButtonDisabled]}
              onPress={handleConfirm}
              disabled={!gmName.trim()}
              activeOpacity={0.8}
            >
              <Text style={styles.confirmButtonText}>Start Career</Text>
            </TouchableOpacity>
          </View>
        </TouchableWithoutFeedback>
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
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.primary,
  },
  backButton: {
    width: 80,
  },
  backButtonText: {
    color: colors.textOnPrimary,
    fontSize: fontSize.md,
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.textOnPrimary,
  },
  viewModeContainer: {
    flexDirection: 'row',
    padding: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  viewModeButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.md,
  },
  viewModeButtonActive: {
    backgroundColor: colors.primary,
  },
  viewModeText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  viewModeTextActive: {
    color: colors.textOnPrimary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  conferenceSection: {
    marginBottom: spacing.lg,
  },
  conferenceHeader: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  divisionSection: {
    marginBottom: spacing.sm,
  },
  divisionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    ...shadows.sm,
  },
  divisionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  expandIcon: {
    fontSize: fontSize.xl,
    color: colors.primary,
    fontWeight: fontWeight.bold,
  },
  teamsContainer: {
    paddingTop: spacing.sm,
    paddingLeft: spacing.sm,
  },
  allTeamsGrid: {
    gap: spacing.sm,
  },
  teamCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    borderLeftWidth: 4,
    borderLeftColor: colors.border,
    ...shadows.sm,
  },
  teamCardSelected: {
    borderLeftColor: colors.secondary,
    backgroundColor: colors.primary + '10',
  },
  teamCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  teamAbbr: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.textSecondary,
    width: 50,
  },
  teamAbbrSelected: {
    color: colors.primary,
  },
  teamInfo: {
    flex: 1,
  },
  teamName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  teamNameSelected: {
    color: colors.primary,
  },
  teamMeta: {
    fontSize: fontSize.sm,
    color: colors.textLight,
    marginTop: spacing.xxs,
  },
  teamMetaSelected: {
    color: colors.textSecondary,
  },
  checkmark: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.success,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkText: {
    color: colors.textOnPrimary,
    fontWeight: fontWeight.bold,
    fontSize: fontSize.md,
  },
  bottomPanel: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    ...shadows.lg,
  },
  selectedTeamBanner: {
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  selectedTeamLabel: {
    fontSize: fontSize.sm,
    color: colors.textOnPrimary,
    opacity: 0.8,
  },
  selectedTeamName: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.textOnPrimary,
  },
  inputSection: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  textInput: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  saveSlotSection: {
    marginBottom: spacing.lg,
  },
  saveSlotButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  saveSlotButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.md,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  saveSlotButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  saveSlotText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
  },
  saveSlotTextActive: {
    color: colors.textOnPrimary,
  },
  confirmButton: {
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    ...shadows.md,
  },
  confirmButtonDisabled: {
    backgroundColor: colors.textLight,
  },
  confirmButtonText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.textOnPrimary,
  },
});

export default TeamSelectionScreen;
