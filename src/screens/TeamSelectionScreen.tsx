/**
 * TeamSelectionScreen
 * Select a team to manage in your GM career
 */

import React, { useState, useRef } from 'react';
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
  MarketSize,
  ALL_CONFERENCES,
  ALL_DIVISIONS,
  getFullTeamName,
} from '../core/models/team/FakeCities';
import { StadiumType } from '../core/models/team/Stadium';
import { SaveSlot } from '../services/storage/GameStorage';

type DifficultyLevel = 'Easy' | 'Normal' | 'Hard';

function getDifficulty(marketSize: MarketSize): DifficultyLevel {
  switch (marketSize) {
    case 'large':
      return 'Easy';
    case 'medium':
      return 'Normal';
    case 'small':
      return 'Hard';
  }
}

function getDifficultyColor(difficulty: DifficultyLevel): string {
  switch (difficulty) {
    case 'Easy':
      return colors.success;
    case 'Normal':
      return colors.warning;
    case 'Hard':
      return colors.error;
  }
}

function getStadiumLabel(type: StadiumType): string {
  switch (type) {
    case 'domeFixed':
      return 'Dome';
    case 'domeRetractable':
      return 'Retractable Roof';
    case 'outdoorWarm':
      return 'Open Air (Warm)';
    case 'outdoorCold':
      return 'Open Air (Cold)';
  }
}

/** Simple deterministic hash from a string */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function getStartingCapSpace(marketSize: MarketSize, abbr: string): number {
  const h = simpleHash(abbr);
  switch (marketSize) {
    case 'large':
      return 80 + (h % 21); // $80-100M
    case 'medium':
      return 100 + (h % 31); // $100-130M
    case 'small':
      return 130 + (h % 31); // $130-160M
  }
}

function getProjectedRecord(
  difficulty: DifficultyLevel,
  abbr: string
): { wins: number; losses: number } {
  const h = simpleHash(abbr);
  switch (difficulty) {
    case 'Easy': {
      const wins = 9 + (h % 3);
      return { wins, losses: 17 - wins };
    }
    case 'Normal': {
      const wins = 6 + (h % 3);
      return { wins, losses: 17 - wins };
    }
    case 'Hard': {
      const wins = 3 + (h % 3);
      return { wins, losses: 17 - wins };
    }
  }
}

function getRosterGrade(difficulty: DifficultyLevel, abbr: string): string {
  const h = simpleHash(abbr);
  switch (difficulty) {
    case 'Easy':
      return h % 2 === 0 ? 'A' : 'B+';
    case 'Normal':
      return h % 2 === 0 ? 'B' : 'C+';
    case 'Hard':
      return h % 2 === 0 ? 'C' : 'D+';
  }
}

function getRosterGradeColor(grade: string): string {
  if (grade.startsWith('A')) return colors.success;
  if (grade.startsWith('B')) return colors.info;
  if (grade.startsWith('C')) return colors.warning;
  return colors.error;
}

interface StarPlayer {
  position: string;
  name: string;
  ovr: number;
}

const FIRST_NAMES = ['J.', 'M.', 'K.', 'D.', 'T.', 'A.', 'R.', 'C.', 'L.', 'B.'];
const LAST_NAMES = [
  'Smith',
  'Jones',
  'Brown',
  'Williams',
  'Johnson',
  'Davis',
  'Miller',
  'Wilson',
  'Moore',
  'Taylor',
  'Anderson',
  'Thomas',
  'Jackson',
  'White',
  'Harris',
  'Martin',
  'Thompson',
  'Garcia',
  'Robinson',
  'Clark',
];
const STAR_POSITIONS = ['QB', 'WR', 'RB', 'TE', 'OT', 'DE', 'DT', 'LB', 'CB', 'S'];

function getStarPlayers(team: FakeCity): StarPlayer[] {
  const h = simpleHash(team.abbreviation);
  const difficulty = getDifficulty(team.marketSize);
  const baseOvr = difficulty === 'Easy' ? 80 : difficulty === 'Normal' ? 75 : 70;
  const players: StarPlayer[] = [];
  const positions = ['QB'];
  const pos2Idx = (h % 9) + 1; // skip QB at 0
  positions.push(STAR_POSITIONS[pos2Idx]);
  let pos3Idx = ((h >> 4) % 9) + 1;
  if (pos3Idx === pos2Idx) pos3Idx = (pos3Idx % 9) + 1;
  positions.push(STAR_POSITIONS[pos3Idx]);

  for (let i = 0; i < 3; i++) {
    const nameHash = simpleHash(team.abbreviation + i);
    players.push({
      position: positions[i],
      name: `${FIRST_NAMES[nameHash % FIRST_NAMES.length]} ${LAST_NAMES[(nameHash >> 3) % LAST_NAMES.length]}`,
      ovr: baseOvr + (nameHash % 8),
    });
  }
  return players;
}

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
  const scrollViewRef = useRef<ScrollView>(null);

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
    const difficulty = getDifficulty(team.marketSize);
    const difficultyColor = getDifficultyColor(difficulty);
    const record = getProjectedRecord(difficulty, team.abbreviation);
    const capSpace = getStartingCapSpace(team.marketSize, team.abbreviation);
    const grade = getRosterGrade(difficulty, team.abbreviation);
    const gradeColor = getRosterGradeColor(grade);

    return (
      <TouchableOpacity
        key={team.abbreviation}
        style={[styles.teamCard, isSelected && styles.teamCardSelected]}
        onPress={() => {
          setSelectedTeam(team);
          // Auto-scroll to bottom so user sees the GM name input and Start Career button
          setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
          }, 100);
        }}
        activeOpacity={0.7}
        accessibilityLabel={`${getFullTeamName(team)}, ${difficulty} difficulty, roster grade ${grade}, projected ${record.wins}-${record.losses}, $${capSpace}M cap${isSelected ? ', selected' : ''}`}
        accessibilityRole="button"
        hitSlop={accessibility.hitSlop}
      >
        <View style={styles.teamCardContent}>
          <Text style={[styles.teamAbbr, isSelected && styles.teamAbbrSelected]}>
            {team.abbreviation}
          </Text>
          <View style={styles.teamInfo}>
            <Text style={[styles.teamName, isSelected && styles.teamNameSelected]}>
              {getFullTeamName(team)}
            </Text>
            <View style={styles.teamDetailRow}>
              <Text style={[styles.teamMeta, isSelected && styles.teamMetaSelected]}>
                {team.marketSize.charAt(0).toUpperCase() + team.marketSize.slice(1)} Market
              </Text>
              <Text style={styles.teamDetailSeparator}>|</Text>
              <Text style={[styles.teamMeta, isSelected && styles.teamMetaSelected]}>
                {getStadiumLabel(team.stadiumType)}
              </Text>
            </View>
            <View style={styles.teamDetailRow}>
              <Text style={[styles.teamMeta, isSelected && styles.teamMetaSelected]}>
                Proj: {record.wins}-{record.losses}
              </Text>
              <Text style={styles.teamDetailSeparator}>|</Text>
              <Text style={[styles.teamMeta, isSelected && styles.teamMetaSelected]}>
                ${capSpace}M cap
              </Text>
            </View>
          </View>
          <View style={styles.badgeColumn}>
            <View style={[styles.difficultyBadge, { borderColor: difficultyColor }]}>
              <Text style={[styles.difficultyText, { color: difficultyColor }]}>
                {difficulty}
              </Text>
            </View>
            <View style={[styles.rosterGradeBadge, { borderColor: gradeColor }]}>
              <Text style={[styles.rosterGradeText, { color: gradeColor }]}>{grade}</Text>
            </View>
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
                    accessibilityLabel={`${conference} ${division}, ${isExpanded ? 'collapse' : 'expand'}`}
                    accessibilityRole="button"
                    hitSlop={accessibility.hitSlop}
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
          accessibilityLabel="View by division"
          accessibilityRole="button"
          accessibilityState={{ selected: viewMode === 'conference' }}
          hitSlop={accessibility.hitSlop}
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
          accessibilityLabel="View all teams"
          accessibilityRole="button"
          accessibilityState={{ selected: viewMode === 'all' }}
          hitSlop={accessibility.hitSlop}
        >
          <Text style={[styles.viewModeText, viewMode === 'all' && styles.viewModeTextActive]}>
            All Teams
          </Text>
        </TouchableOpacity>
      </View>

      {/* Teams List */}
      <ScrollView
        ref={scrollViewRef}
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

            <View style={styles.starPlayersSection}>
              <Text style={styles.starPlayersTitle}>Star Players</Text>
              <View style={styles.starPlayersList}>
                {getStarPlayers(selectedTeam).map((player) => (
                  <View key={player.position} style={styles.starPlayerItem}>
                    <Text style={styles.starPlayerPos}>{player.position}</Text>
                    <Text style={styles.starPlayerName}>{player.name}</Text>
                    <Text style={styles.starPlayerOvr}>{player.ovr} OVR</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>GM Name</Text>
              <TextInput
                style={styles.textInput}
                value={gmName}
                onChangeText={setGmName}
                placeholder="Enter your GM name"
                placeholderTextColor={colors.textLight}
                autoCapitalize="words"
                accessibilityLabel="GM name"
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
                    accessibilityLabel={`Save slot ${slot + 1}${saveSlot === slot ? ', selected' : ''}`}
                    accessibilityRole="button"
                    hitSlop={accessibility.hitSlop}
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
              accessibilityLabel="Start career"
              accessibilityRole="button"
              accessibilityState={{ disabled: !gmName.trim() }}
              hitSlop={accessibility.hitSlop}
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
  teamDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xxs,
  },
  teamDetailSeparator: {
    color: colors.border,
    marginHorizontal: spacing.xs,
    fontSize: fontSize.sm,
  },
  teamMeta: {
    fontSize: fontSize.sm,
    color: colors.textLight,
  },
  teamMetaSelected: {
    color: colors.textSecondary,
  },
  badgeColumn: {
    alignItems: 'center',
    gap: spacing.xxs,
    marginLeft: spacing.sm,
  },
  difficultyBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
  },
  difficultyText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  rosterGradeBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
  },
  rosterGradeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
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
  starPlayersSection: {
    marginBottom: spacing.md,
  },
  starPlayersTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  starPlayersList: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  starPlayerItem: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  starPlayerPos: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    marginBottom: 2,
  },
  starPlayerName: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
    marginBottom: 2,
  },
  starPlayerOvr: {
    fontSize: fontSize.xs,
    color: colors.textLight,
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
