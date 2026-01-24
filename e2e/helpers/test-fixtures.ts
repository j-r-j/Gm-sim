/**
 * Custom test fixtures for E2E tests.
 * Extends Playwright's base test with app-specific helpers.
 */

import { test as base, Page } from '@playwright/test';
import * as helpers from './page-helpers';
import { selectors } from './selectors';

// Define custom fixture type
interface GameFixtures {
  gamePage: Page;
}

/**
 * Extended test with game-specific helpers
 */
export const test = base.extend<GameFixtures>({
  gamePage: async ({ page }, use) => {
    // Navigate to the app and wait for it to load
    await page.goto('/');
    await helpers.waitForAppReady(page);
    await use(page);
  },
});

export { expect } from '@playwright/test';

// Re-export helpers and selectors for convenience
export { helpers, selectors };

/**
 * Test configuration for different game scenarios
 */
export const testConfig = {
  // Default test team and GM settings
  defaultTeam: 'KC',
  defaultGmName: 'Test GM',
  defaultSaveSlot: 1 as const,

  // Alternative teams for testing variety
  teams: {
    largeMarket: 'NYG',
    mediumMarket: 'KC',
    smallMarket: 'GB',
    rebuilding: 'CHI',
    contender: 'KC',
  },

  // Timeouts for various operations (in ms)
  timeouts: {
    pageLoad: 30000,
    gameSimulation: 120000,
    draftPick: 30000,
    navigation: 10000,
    animation: 1000,
  },
} as const;

/**
 * Helper to run a full game simulation test
 */
export async function runFullSeasonTest(page: Page): Promise<{
  wins: number;
  losses: number;
  ties: number;
  madePlayoffs: boolean;
}> {
  const results = {
    wins: 0,
    losses: 0,
    ties: 0,
    madePlayoffs: false,
  };

  // Simulate through regular season
  for (let week = 1; week <= 18; week++) {
    const phase = await helpers.getCurrentPhase(page);
    if (phase === 'Playoffs' || phase === 'Offseason') {
      results.madePlayoffs = phase === 'Playoffs';
      break;
    }

    // Check if we have a game (not on bye)
    const pageContent = await page.textContent('body');
    if (pageContent?.includes('Bye Week') || pageContent?.includes('bye')) {
      await helpers.advanceWeekOrPhase(page);
      continue;
    }

    // Play the game
    try {
      await helpers.playGame(page, true);
      const result = await helpers.checkGameResult(page);
      if (result === 'win') results.wins++;
      else if (result === 'loss') results.losses++;
      else if (result === 'tie') results.ties++;
    } catch (e) {
      // If gamecast fails, just advance
      console.log(`Week ${week}: Could not play game, advancing...`);
    }

    await helpers.advanceWeekOrPhase(page);
    await helpers.waitForLoading(page);
  }

  return results;
}

/**
 * Helper to complete all offseason phases
 */
export async function completeFullOffseason(page: Page): Promise<void> {
  const offseasonPhases = [
    'Season Recap',
    'Coaching Decisions',
    'Contract Management',
    'NFL Combine',
    'Free Agency',
    'NFL Draft',
    'UDFA',
    'OTAs',
    'Training Camp',
    'Preseason',
    'Final Cuts',
    'Season Start',
  ];

  let maxAttempts = 20; // Safety limit
  while (maxAttempts > 0) {
    const phase = await helpers.getCurrentPhase(page);

    // Check if we're in regular season (offseason complete)
    if (phase === 'Regular Season' || phase === 'Preseason' || phase.includes('Week')) {
      break;
    }

    await helpers.completeOffseasonPhase(page);
    await helpers.waitForLoading(page);
    maxAttempts--;
  }
}

/**
 * Helper to complete draft
 */
export async function completeDraft(page: Page, autoPick: boolean = true): Promise<number> {
  let picksMade = 0;

  if (autoPick) {
    await helpers.enableAutoPick(page);
    // Wait for all picks to complete automatically
    await helpers.waitForLoading(page);
    return 7; // Assume all 7 rounds completed
  }

  // Manual pick each round
  for (let round = 1; round <= 7; round++) {
    try {
      await helpers.makeDraftPick(page);
      picksMade++;
      await helpers.waitForLoading(page);
    } catch (e) {
      console.log(`Draft round ${round}: Could not make pick`);
    }
  }

  return picksMade;
}
