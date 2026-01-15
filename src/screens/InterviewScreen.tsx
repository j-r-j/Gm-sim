/**
 * InterviewScreen
 * Displays the interview experience when meeting with a team
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../styles';
import {
  InterviewRecord,
  OwnerPreview,
  ContractOffer,
  getOfferSummary,
} from '../core/career/InterviewSystem';

/**
 * Props for InterviewScreen
 */
export interface InterviewScreenProps {
  interview: InterviewRecord | null;
  teamName: string;
  teamCity: string;
  onBack: () => void;
  onConductInterview: () => void;
  onAcceptOffer: () => void;
  onDeclineOffer: () => void;
}

/**
 * Owner Preview Component
 */
function OwnerPreviewSection({ ownerPreview }: { ownerPreview: OwnerPreview }): React.JSX.Element {
  return (
    <View style={styles.ownerSection}>
      <Text style={styles.sectionTitle}>Meeting with Owner</Text>
      <Text style={styles.ownerName}>{ownerPreview.fullName}</Text>

      <View style={styles.ownerStats}>
        <View style={styles.ownerStatItem}>
          <Text style={styles.ownerStatValue}>{ownerPreview.yearsAsOwner}</Text>
          <Text style={styles.ownerStatLabel}>Years as Owner</Text>
        </View>
        <View style={styles.ownerStatItem}>
          <Text style={styles.ownerStatValue}>{ownerPreview.championshipsWon}</Text>
          <Text style={styles.ownerStatLabel}>Championships</Text>
        </View>
        <View style={styles.ownerStatItem}>
          <Text style={styles.ownerStatValue}>{ownerPreview.previousGMsFired}</Text>
          <Text style={styles.ownerStatLabel}>GMs Fired</Text>
        </View>
      </View>

      <View style={styles.ownerTraits}>
        <View style={styles.traitRow}>
          <Text style={styles.traitLabel}>Patience:</Text>
          <Text style={[styles.traitValue, getTraitStyle(ownerPreview.patienceLevel)]}>
            {formatTraitLevel(ownerPreview.patienceLevel)}
          </Text>
        </View>
        <View style={styles.traitRow}>
          <Text style={styles.traitLabel}>Spending:</Text>
          <Text style={[styles.traitValue, getTraitStyle(ownerPreview.spendingLevel)]}>
            {formatTraitLevel(ownerPreview.spendingLevel)}
          </Text>
        </View>
        <View style={styles.traitRow}>
          <Text style={styles.traitLabel}>Control Level:</Text>
          <Text style={[styles.traitValue, getTraitStyle(ownerPreview.controlLevel)]}>
            {formatTraitLevel(ownerPreview.controlLevel)}
          </Text>
        </View>
      </View>

      <View style={styles.quoteSection}>
        <Text style={styles.quoteText}>"{ownerPreview.keyQuote}"</Text>
      </View>

      {ownerPreview.warnings.length > 0 && (
        <View style={styles.warningsSection}>
          <Text style={styles.warningsTitle}>Red Flags to Consider</Text>
          {ownerPreview.warnings.map((warning, i) => (
            <View key={i} style={styles.warningRow}>
              <Text style={styles.warningIcon}>⚠</Text>
              <Text style={styles.warningText}>{warning}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

/**
 * Contract Offer Component
 */
function ContractOfferSection({
  offer,
  onAccept,
  onDecline,
}: {
  offer: ContractOffer;
  onAccept: () => void;
  onDecline: () => void;
}): React.JSX.Element {
  return (
    <View style={styles.offerSection}>
      <Text style={styles.sectionTitle}>Contract Offer</Text>

      <View style={styles.offerHeader}>
        <Text style={styles.offerTeam}>{offer.teamName}</Text>
        <Text style={styles.offerSummary}>{getOfferSummary(offer)}</Text>
      </View>

      <View style={styles.offerDetails}>
        <View style={styles.offerDetailRow}>
          <Text style={styles.offerDetailLabel}>Annual Salary</Text>
          <Text style={styles.offerDetailValue}>${(offer.annualSalary / 1000000).toFixed(2)}M</Text>
        </View>
        <View style={styles.offerDetailRow}>
          <Text style={styles.offerDetailLabel}>Contract Length</Text>
          <Text style={styles.offerDetailValue}>{offer.lengthYears} Years</Text>
        </View>
        <View style={styles.offerDetailRow}>
          <Text style={styles.offerDetailLabel}>Total Value</Text>
          <Text style={styles.offerDetailValue}>${(offer.totalValue / 1000000).toFixed(2)}M</Text>
        </View>
        {offer.signingBonus > 0 && (
          <View style={styles.offerDetailRow}>
            <Text style={styles.offerDetailLabel}>Signing Bonus</Text>
            <Text style={styles.offerDetailValue}>${(offer.signingBonus / 1000).toFixed(0)}K</Text>
          </View>
        )}
        <View style={styles.offerDetailRow}>
          <Text style={styles.offerDetailLabel}>Autonomy Level</Text>
          <Text style={styles.offerDetailValue}>
            {offer.autonomyLevel.charAt(0).toUpperCase() + offer.autonomyLevel.slice(1)}
          </Text>
        </View>
        <View style={styles.offerDetailRow}>
          <Text style={styles.offerDetailLabel}>Budget Access</Text>
          <Text style={styles.offerDetailValue}>
            {offer.budgetLevel.charAt(0).toUpperCase() + offer.budgetLevel.slice(1)}
          </Text>
        </View>
      </View>

      <View style={styles.offerButtons}>
        <TouchableOpacity style={styles.acceptButton} onPress={onAccept}>
          <Text style={styles.acceptButtonText}>Accept Offer</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.declineButton} onPress={onDecline}>
          <Text style={styles.declineButtonText}>Decline</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/**
 * Format trait level for display
 */
function formatTraitLevel(level: string): string {
  return level
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Get style for trait value based on whether it's positive or negative
 */
function getTraitStyle(level: string): object {
  const positiveTraits = ['very_patient', 'patient', 'lavish', 'generous', 'hands_off'];
  const negativeTraits = ['very_impatient', 'impatient', 'frugal', 'micromanager', 'controlling'];

  if (positiveTraits.includes(level)) {
    return { color: colors.success };
  }
  if (negativeTraits.includes(level)) {
    return { color: colors.error };
  }
  return { color: colors.warning };
}

/**
 * Interview Screen Component
 */
export function InterviewScreen({
  interview,
  teamName,
  teamCity,
  onBack,
  onConductInterview,
  onAcceptOffer,
  onDeclineOffer,
}: InterviewScreenProps): React.JSX.Element {
  const [isInterviewing, setIsInterviewing] = useState(false);

  // Handle entering interview
  const handleStartInterview = () => {
    setIsInterviewing(true);
    // Simulate interview delay
    setTimeout(() => {
      onConductInterview();
      setIsInterviewing(false);
    }, 1500);
  };

  // No interview found
  if (!interview) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>{'< Back'}</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Interview</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No interview scheduled with this team</Text>
          <TouchableOpacity style={styles.returnButton} onPress={onBack}>
            <Text style={styles.returnButtonText}>Return to Job Market</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const isScheduled = interview.status === 'scheduled';
  const isCompleted = interview.status === 'completed' || interview.status === 'rejected';
  const hasOffer = interview.status === 'offer_extended' && interview.offer !== null;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>{'< Back'}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Interview</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Team Info */}
        <View style={styles.teamSection}>
          <Text style={styles.teamName}>
            {teamCity} {teamName}
          </Text>
          <Text style={styles.teamSubtitle}>General Manager Position</Text>
        </View>

        {/* Waiting Room / Pre-Interview State */}
        {isScheduled && !isInterviewing && (
          <View style={styles.waitingSection}>
            <Text style={styles.waitingTitle}>Interview Waiting Room</Text>
            <Text style={styles.waitingText}>
              You're about to meet with the {teamName} ownership and front office. This is your
              chance to make a strong impression.
            </Text>
            <Text style={styles.waitingHint}>
              Your reputation and career record will influence how the interview goes.
            </Text>

            <TouchableOpacity style={styles.startButton} onPress={handleStartInterview}>
              <Text style={styles.startButtonText}>Enter Interview</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Interviewing State */}
        {isInterviewing && (
          <View style={styles.interviewingSection}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.interviewingText}>Interview in progress...</Text>
            <Text style={styles.interviewingHint}>Discussing vision, philosophy, and plans...</Text>
          </View>
        )}

        {/* Interview Results */}
        {(isCompleted || hasOffer) && interview.interviewScore !== null && (
          <View style={styles.resultsSection}>
            <Text style={styles.sectionTitle}>Interview Results</Text>

            {/* Performance Score */}
            <View style={styles.scoreSection}>
              <Text style={styles.scoreLabel}>Your Performance</Text>
              <Text
                style={[
                  styles.scoreValue,
                  {
                    color:
                      interview.interviewScore >= 70
                        ? colors.success
                        : interview.interviewScore >= 50
                          ? colors.warning
                          : colors.error,
                  },
                ]}
              >
                {interview.interviewScore >= 70
                  ? 'Excellent'
                  : interview.interviewScore >= 55
                    ? 'Good'
                    : interview.interviewScore >= 40
                      ? 'Average'
                      : 'Poor'}
              </Text>
              <Text style={styles.scoreDetail}>
                {interview.interviewScore >= 70
                  ? 'You made an outstanding impression!'
                  : interview.interviewScore >= 55
                    ? 'The interview went well overall.'
                    : interview.interviewScore >= 40
                      ? 'The interview had some ups and downs.'
                      : 'The interview did not go as planned.'}
              </Text>
            </View>

            {/* Rejection Message */}
            {interview.status === 'rejected' && interview.rejectionReason && (
              <View style={styles.rejectionSection}>
                <Text style={styles.rejectionTitle}>Decision</Text>
                <Text style={styles.rejectionText}>{interview.rejectionReason}</Text>
              </View>
            )}
          </View>
        )}

        {/* Owner Preview */}
        {interview.ownerPreview && (isCompleted || hasOffer) && (
          <OwnerPreviewSection ownerPreview={interview.ownerPreview} />
        )}

        {/* Contract Offer */}
        {hasOffer && interview.offer && (
          <ContractOfferSection
            offer={interview.offer}
            onAccept={onAcceptOffer}
            onDecline={onDeclineOffer}
          />
        )}

        {/* No Offer Yet */}
        {isCompleted && !hasOffer && !interview.rejectionReason && (
          <View style={styles.pendingSection}>
            <Text style={styles.pendingTitle}>Decision Pending</Text>
            <Text style={styles.pendingText}>
              The {teamName} are still deliberating. Check back later for their decision.
            </Text>
          </View>
        )}
      </ScrollView>
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
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.xs,
  },
  backButtonText: {
    color: colors.primary,
    fontSize: fontSize.md,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  headerSpacer: {
    width: 60,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.md,
  },
  teamSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    paddingVertical: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
  },
  teamName: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  teamSubtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  waitingSection: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  waitingTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  waitingText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.sm,
    lineHeight: 22,
  },
  waitingHint: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: spacing.lg,
  },
  startButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
    borderRadius: borderRadius.md,
  },
  startButtonText: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  interviewingSection: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xxl,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  interviewingText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginTop: spacing.lg,
  },
  interviewingHint: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  resultsSection: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  scoreSection: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  scoreLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  scoreValue: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    marginBottom: spacing.sm,
  },
  scoreDetail: {
    fontSize: fontSize.md,
    color: colors.text,
    textAlign: 'center',
  },
  rejectionSection: {
    marginTop: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.error + '15',
    borderRadius: borderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.error,
  },
  rejectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.error,
    marginBottom: spacing.xs,
  },
  rejectionText: {
    fontSize: fontSize.md,
    color: colors.text,
  },
  ownerSection: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  ownerName: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  ownerStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
  },
  ownerStatItem: {
    alignItems: 'center',
  },
  ownerStatValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  ownerStatLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  ownerTraits: {
    marginBottom: spacing.lg,
  },
  traitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  traitLabel: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  traitValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  quoteSection: {
    padding: spacing.md,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    marginBottom: spacing.md,
  },
  quoteText: {
    fontSize: fontSize.md,
    fontStyle: 'italic',
    color: colors.text,
    lineHeight: 22,
  },
  warningsSection: {
    marginTop: spacing.md,
  },
  warningsTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.warning,
    marginBottom: spacing.sm,
  },
  warningRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  warningIcon: {
    fontSize: fontSize.md,
    marginRight: spacing.sm,
  },
  warningText: {
    fontSize: fontSize.sm,
    color: colors.text,
    flex: 1,
  },
  offerSection: {
    backgroundColor: colors.success + '10',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 2,
    borderColor: colors.success + '40',
  },
  offerHeader: {
    marginBottom: spacing.lg,
  },
  offerTeam: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  offerSummary: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.success,
  },
  offerDetails: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  offerDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  offerDetailLabel: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  offerDetailValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  offerButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  acceptButton: {
    flex: 1,
    backgroundColor: colors.success,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  acceptButtonText: {
    color: colors.background,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  declineButton: {
    flex: 1,
    backgroundColor: colors.background,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.error,
  },
  declineButtonText: {
    color: colors.error,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  pendingSection: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
  },
  pendingTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.warning,
    marginBottom: spacing.sm,
  },
  pendingText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyStateText: {
    fontSize: fontSize.lg,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  returnButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.md,
  },
  returnButtonText: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
});
