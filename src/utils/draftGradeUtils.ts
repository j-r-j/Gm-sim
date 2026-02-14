/**
 * Draft Grade Utilities
 * Maps draft letter grades to tier colors and labels.
 */

import { colors } from '../styles/theme';
import { DraftLetterGrade } from '../core/draft/DraftDayNarrator';

/**
 * Returns a color for a draft letter grade using existing tier colors.
 */
export function getGradeColor(grade: DraftLetterGrade): string {
  switch (grade) {
    case 'A+':
    case 'A':
      return colors.tierElite;
    case 'A-':
    case 'B+':
      return colors.tierExcellent;
    case 'B':
    case 'B-':
      return colors.tierGood;
    case 'C+':
    case 'C':
      return colors.tierAverage;
    case 'C-':
    case 'D':
      return colors.tierBelowAverage;
    case 'F':
      return colors.tierPoor;
  }
}

/**
 * Returns a human-readable label for a draft letter grade.
 */
export function getGradeLabel(grade: DraftLetterGrade): string {
  switch (grade) {
    case 'A+':
      return 'Steal';
    case 'A':
      return 'Great Value';
    case 'A-':
      return 'Good Value';
    case 'B+':
      return 'Solid Pick';
    case 'B':
      return 'Fair Value';
    case 'B-':
      return 'Slight Reach';
    case 'C+':
      return 'Reach';
    case 'C':
      return 'Overdrafted';
    case 'C-':
      return 'Bad Value';
    case 'D':
      return 'Major Reach';
    case 'F':
      return 'Wasted Pick';
  }
}
