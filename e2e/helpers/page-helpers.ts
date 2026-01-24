/**
 * Helper functions for E2E tests.
 * Provides common actions and utilities for Playwright tests.
 */

import { Page, expect } from '@playwright/test';
import { selectors } from './selectors';

/**
 * Wait for the app to be ready (initial load complete)
 */
export async function waitForAppReady(page: Page): Promise<void> {
  // Wait for the loading text to disappear
  await page.waitForSelector(selectors.startScreen.loadingIndicator, {
    state: 'hidden',
    timeout: 30000,
  });
  // Wait for the logo/title to appear
  await page.waitForSelector(selectors.startScreen.logo, {
    state: 'visible',
    timeout: 30000,
  });
}

/**
 * Wait for any loading state to finish
 */
export async function waitForLoading(page: Page): Promise<void> {
  // Wait a brief moment for loading to potentially start
  await page.waitForTimeout(500);
  // Then wait for any loading indicators to disappear
  const loadingTexts = ['Loading', 'Simulating', 'Processing', 'Generating'];
  for (const text of loadingTexts) {
    try {
      await page.waitForSelector(`text=${text}`, {
        state: 'hidden',
        timeout: 60000,
      });
    } catch {
      // Loading text wasn't visible, that's fine
    }
  }
}

/**
 * Navigate to Start Screen from any screen
 */
export async function navigateToStart(page: Page): Promise<void> {
  await page.goto('/');
  await waitForAppReady(page);
}

/**
 * Start a new game with the given team and GM name
 */
export async function startNewGame(
  page: Page,
  teamAbbreviation: string,
  gmName: string,
  saveSlot: 1 | 2 | 3 = 1
): Promise<void> {
  // Click New Game
  await page.click(selectors.startScreen.newGameButton);
  await page.waitForSelector(selectors.teamSelection.header, {
    state: 'visible',
  });

  // Click "All Teams" tab for easier selection
  await page.click(selectors.teamSelection.allTeamsTab);
  await page.waitForTimeout(500);

  // Select the team
  await page.click(selectors.teamSelection.teamCard(teamAbbreviation));

  // Enter GM name
  await page.fill(selectors.teamSelection.gmNameInput, gmName);

  // Select save slot
  const slotSelector =
    saveSlot === 1
      ? selectors.teamSelection.saveSlot1
      : saveSlot === 2
        ? selectors.teamSelection.saveSlot2
        : selectors.teamSelection.saveSlot3;
  await page.click(slotSelector);

  // Click Start Career
  await page.click(selectors.teamSelection.startCareerButton);
  await waitForLoading(page);
}

/**
 * Complete staff decision (keep or hire new)
 */
export async function completeStaffDecision(
  page: Page,
  keepCurrent: boolean = true
): Promise<void> {
  try {
    await page.waitForSelector(selectors.staffDecision.header, {
      state: 'visible',
      timeout: 10000,
    });

    if (keepCurrent) {
      await page.click(selectors.staffDecision.keepStaff);
    } else {
      await page.click(selectors.staffDecision.hireNew);
    }

    await waitForLoading(page);
  } catch {
    // Staff decision screen might be skipped
    console.log('Staff decision screen not displayed, skipping...');
  }
}

/**
 * Wait for dashboard to be visible
 */
export async function waitForDashboard(page: Page): Promise<void> {
  // Look for characteristic dashboard elements
  await page.waitForSelector(selectors.dashboard.rosterCard, {
    state: 'visible',
    timeout: 60000,
  });
}

/**
 * Click a dashboard menu card
 */
export async function clickDashboardCard(page: Page, cardSelector: string): Promise<void> {
  await page.click(cardSelector);
  await waitForLoading(page);
}

/**
 * Navigate back to dashboard from any sub-screen
 */
export async function navigateBackToDashboard(page: Page): Promise<void> {
  // Try different back button variants
  const backSelectors = [
    selectors.common.backButton,
    'text=← Back',
    'text=←',
    '[aria-label="Back"]',
    '[aria-label="Go back"]',
  ];

  for (const selector of backSelectors) {
    try {
      const backButton = page.locator(selector).first();
      if (await backButton.isVisible({ timeout: 2000 })) {
        await backButton.click();
        await waitForLoading(page);
        return;
      }
    } catch {
      // Try next selector
    }
  }

  // If no back button found, might already be on dashboard
  console.log('No back button found, may already be on dashboard');
}

/**
 * Advance week/phase from dashboard
 */
export async function advanceWeekOrPhase(page: Page): Promise<void> {
  // Try both advance week and advance phase buttons
  const advanceButtons = [
    selectors.dashboard.advanceWeekButton,
    selectors.dashboard.advancePhaseButton,
    'text=Advance Week',
    'text=Advance Phase',
    'button:has-text("Advance")',
  ];

  for (const selector of advanceButtons) {
    try {
      const button = page.locator(selector).first();
      if (await button.isVisible({ timeout: 2000 })) {
        await button.click();
        await waitForLoading(page);
        return;
      }
    } catch {
      // Try next button
    }
  }

  throw new Error('Could not find advance button');
}

/**
 * Play a game through gamecast
 */
export async function playGame(page: Page, simFull: boolean = true): Promise<void> {
  await clickDashboardCard(page, selectors.dashboard.gamecastCard);

  // Wait for gamecast to load
  await page.waitForTimeout(2000);

  if (simFull) {
    // Try to sim the full game
    const simButtons = [
      selectors.gamecast.simGameButton,
      'text=Sim Game',
      'text=Sim All',
      'text=Simulate',
    ];

    for (const selector of simButtons) {
      try {
        const button = page.locator(selector).first();
        if (await button.isVisible({ timeout: 3000 })) {
          await button.click();
          await waitForLoading(page);
          break;
        }
      } catch {
        // Try next button
      }
    }
  }

  // Wait for game to complete and return to dashboard or results
  await waitForLoading(page);

  // Try to continue/close the results
  const continueButtons = [
    selectors.gamecast.continueButton,
    selectors.gamecast.viewResultsButton,
    'text=Continue',
    'text=Close',
    'text=Done',
  ];

  for (const selector of continueButtons) {
    try {
      const button = page.locator(selector).first();
      if (await button.isVisible({ timeout: 3000 })) {
        await button.click();
        await waitForLoading(page);
        break;
      }
    } catch {
      // Try next button
    }
  }
}

/**
 * Complete offseason phase
 */
export async function completeOffseasonPhase(page: Page): Promise<void> {
  const completeButtons = [
    selectors.offseason.completeButton,
    selectors.offseason.advanceButton,
    selectors.offseason.continueButton,
    'text=Complete',
    'text=Advance',
    'text=Continue',
    'text=Skip',
    'text=Next',
  ];

  for (const selector of completeButtons) {
    try {
      const button = page.locator(selector).first();
      if (await button.isVisible({ timeout: 3000 })) {
        await button.click();
        await waitForLoading(page);
        return;
      }
    } catch {
      // Try next button
    }
  }

  // If no specific button found, try advance from dashboard
  await advanceWeekOrPhase(page);
}

/**
 * Make a draft pick
 */
export async function makeDraftPick(page: Page): Promise<void> {
  // Wait for on the clock indicator or pick button
  await page.waitForTimeout(2000);

  const pickButtons = [
    selectors.draft.draftButton,
    selectors.draft.selectButton,
    'text=Draft',
    'text=Select',
    'text=Pick',
  ];

  for (const selector of pickButtons) {
    try {
      const button = page.locator(selector).first();
      if (await button.isVisible({ timeout: 3000 })) {
        await button.click();
        await waitForLoading(page);
        return;
      }
    } catch {
      // Try next button
    }
  }

  throw new Error('Could not find draft pick button');
}

/**
 * Enable auto-pick for draft
 */
export async function enableAutoPick(page: Page): Promise<void> {
  try {
    const autoPickToggle = page.locator(selectors.draft.autoPickToggle);
    if (await autoPickToggle.isVisible({ timeout: 3000 })) {
      await autoPickToggle.click();
    }
  } catch {
    console.log('Auto pick toggle not found');
  }
}

/**
 * Save the current game
 */
export async function saveGame(page: Page): Promise<void> {
  await page.click(selectors.dashboard.saveButton);
  await waitForLoading(page);
}

/**
 * Get the current phase text from dashboard
 */
export async function getCurrentPhase(page: Page): Promise<string> {
  const phaseTexts = [
    'Preseason',
    'Regular Season',
    'Playoffs',
    'Offseason',
    'Season Recap',
    'Coaching Decisions',
    'Contract Management',
    'NFL Combine',
    'Free Agency',
    'NFL Draft',
    'UDFA',
    'OTAs',
    'Training Camp',
    'Final Cuts',
    'Season Start',
  ];

  for (const phase of phaseTexts) {
    const element = page.locator(`text=${phase}`).first();
    if (await element.isVisible({ timeout: 1000 }).catch(() => false)) {
      return phase;
    }
  }

  return 'Unknown';
}

/**
 * Get the current week number from dashboard
 */
export async function getCurrentWeek(page: Page): Promise<number> {
  const weekPattern = /Week (\d+)/;
  const pageContent = await page.textContent('body');
  const match = pageContent?.match(weekPattern);
  return match ? parseInt(match[1], 10) : 0;
}

/**
 * Get current year from dashboard
 */
export async function getCurrentYear(page: Page): Promise<number> {
  const yearPattern = /20\d{2}/;
  const pageContent = await page.textContent('body');
  const match = pageContent?.match(yearPattern);
  return match ? parseInt(match[0], 10) : 0;
}

/**
 * Check if we're in offseason
 */
export async function isInOffseason(page: Page): Promise<boolean> {
  const phase = await getCurrentPhase(page);
  return phase === 'Offseason' || phase.includes('Offseason');
}

/**
 * Check if we're in playoffs
 */
export async function isInPlayoffs(page: Page): Promise<boolean> {
  const phase = await getCurrentPhase(page);
  return phase === 'Playoffs';
}

/**
 * Verify element is visible with assertion
 */
export async function verifyVisible(page: Page, selector: string): Promise<void> {
  await expect(page.locator(selector).first()).toBeVisible({ timeout: 10000 });
}

/**
 * Verify element contains text with assertion
 */
export async function verifyContainsText(
  page: Page,
  selector: string,
  text: string
): Promise<void> {
  await expect(page.locator(selector).first()).toContainText(text, {
    timeout: 10000,
  });
}

/**
 * Take a screenshot with timestamp
 */
export async function takeScreenshot(page: Page, name: string): Promise<Buffer> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return page.screenshot({
    path: `playwright-report/screenshots/${name}-${timestamp}.png`,
    fullPage: true,
  });
}

/**
 * Check if team won the game
 */
export async function checkGameResult(page: Page): Promise<'win' | 'loss' | 'tie' | 'unknown'> {
  const pageContent = await page.textContent('body');
  if (!pageContent) return 'unknown';

  if (pageContent.includes('Victory') || pageContent.includes('WIN')) {
    return 'win';
  }
  if (pageContent.includes('Defeat') || pageContent.includes('LOSS')) {
    return 'loss';
  }
  if (pageContent.includes('Tie') || pageContent.includes('TIE')) {
    return 'tie';
  }
  return 'unknown';
}
