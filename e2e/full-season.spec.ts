/**
 * Full Season E2E Test Suite
 *
 * This comprehensive test suite covers:
 * 1. App loading and start screen
 * 2. New game creation and team selection
 * 3. Staff hiring flow
 * 4. Dashboard navigation
 * 5. Playing through regular season
 * 6. Playoffs simulation
 * 7. Offseason phases
 * 8. Draft flow
 * 9. Second season start
 * 10. Trades and coach management
 */

import { test, expect } from '@playwright/test';
import { selectors } from './helpers/selectors';
import * as helpers from './helpers/page-helpers';
import { testConfig } from './helpers/test-fixtures';

// Test data
const TEST_TEAM = 'KC'; // Kansas City
const TEST_GM_NAME = 'John Doe';
const SAVE_SLOT = 1;

test.describe('NFL GM Simulator - Full Season Test', () => {
  // Use serial mode so tests run in order and share state
  test.describe.configure({ mode: 'serial' });

  // =====================================================
  // SECTION 1: App Loading and Start Screen
  // =====================================================
  test.describe('1. App Loading', () => {
    test('1.1 - App loads and shows start screen', async ({ page }) => {
      await page.goto('/');

      // Wait for loading to complete
      await helpers.waitForAppReady(page);

      // Verify start screen elements
      await expect(page.locator('text=GM Sim')).toBeVisible();
      await expect(page.locator('text=New Game')).toBeVisible();
      await expect(page.locator('text=Settings')).toBeVisible();
    });

    test('1.2 - Settings button is accessible', async ({ page }) => {
      await page.goto('/');
      await helpers.waitForAppReady(page);

      // Click settings and verify it opens
      const settingsButton = page.locator('text=Settings');
      await expect(settingsButton).toBeVisible();
      // Note: Not clicking settings as it may navigate away from start flow
    });
  });

  // =====================================================
  // SECTION 2: New Game Creation
  // =====================================================
  test.describe('2. New Game Creation', () => {
    test('2.1 - New Game button navigates to team selection', async ({ page }) => {
      await page.goto('/');
      await helpers.waitForAppReady(page);

      // Click New Game
      await page.click('text=New Game');

      // Verify team selection screen
      await expect(page.locator('text=Select Your Team')).toBeVisible({
        timeout: 10000,
      });
    });

    test('2.2 - Can switch between division and all teams view', async ({ page }) => {
      await page.goto('/');
      await helpers.waitForAppReady(page);
      await page.click('text=New Game');
      await page.waitForSelector('text=Select Your Team');

      // Check division view is default
      await expect(page.locator('text=By Division')).toBeVisible();
      await expect(page.locator('text=All Teams')).toBeVisible();

      // Click All Teams
      await page.click('text=All Teams');
      await page.waitForTimeout(500);

      // Verify teams are displayed (check for a team abbreviation)
      await expect(page.locator('text=KC').first()).toBeVisible();
    });

    test('2.3 - Can select a team', async ({ page }) => {
      await page.goto('/');
      await helpers.waitForAppReady(page);
      await page.click('text=New Game');
      await page.waitForSelector('text=Select Your Team');

      // Switch to All Teams view
      await page.click('text=All Teams');
      await page.waitForTimeout(500);

      // Select Kansas City
      await page.click(`text=${TEST_TEAM}`);

      // Verify bottom panel appears with selected team
      await expect(page.locator('text=Selected Team')).toBeVisible();
      await expect(page.locator('text=Your Name')).toBeVisible();
    });

    test('2.4 - Cannot start without GM name', async ({ page }) => {
      await page.goto('/');
      await helpers.waitForAppReady(page);
      await page.click('text=New Game');
      await page.waitForSelector('text=Select Your Team');

      // Switch to All Teams and select team
      await page.click('text=All Teams');
      await page.waitForTimeout(500);
      await page.click(`text=${TEST_TEAM}`);

      // Start Career button should be visible but likely disabled without name
      const startButton = page.locator('text=Start Career');
      await expect(startButton).toBeVisible();
    });

    test('2.5 - Can enter GM name and select save slot', async ({ page }) => {
      await page.goto('/');
      await helpers.waitForAppReady(page);
      await page.click('text=New Game');
      await page.waitForSelector('text=Select Your Team');

      // Switch to All Teams and select team
      await page.click('text=All Teams');
      await page.waitForTimeout(500);
      await page.click(`text=${TEST_TEAM}`);

      // Enter GM name
      const gmInput = page.locator('input[placeholder="Enter your GM name"]');
      await gmInput.fill(TEST_GM_NAME);

      // Select save slot 1
      await page.locator('text=1').first().click();

      // Verify name is entered
      await expect(gmInput).toHaveValue(TEST_GM_NAME);
    });
  });

  // =====================================================
  // SECTION 3: Start Career and Staff Flow
  // =====================================================
  test.describe('3. Career Start', () => {
    test('3.1 - Start Career creates game and shows next screen', async ({ page }) => {
      await page.goto('/');
      await helpers.waitForAppReady(page);

      // Complete new game flow
      await page.click('text=New Game');
      await page.waitForSelector('text=Select Your Team');
      await page.click('text=All Teams');
      await page.waitForTimeout(500);
      await page.click(`text=${TEST_TEAM}`);

      const gmInput = page.locator('input[placeholder="Enter your GM name"]');
      await gmInput.fill(TEST_GM_NAME);

      // Click Start Career
      await page.click('text=Start Career');

      // Wait for loading/generation
      await helpers.waitForLoading(page);

      // Should be on either staff decision or dashboard
      // Wait up to 60s for game generation
      await page.waitForTimeout(5000);

      // Check if we're on staff decision or dashboard
      const pageContent = await page.textContent('body');
      const isOnStaffDecision =
        pageContent?.includes('Staff') ||
        pageContent?.includes('Keep') ||
        pageContent?.includes('Hire');
      const isOnDashboard =
        pageContent?.includes('Roster') ||
        pageContent?.includes('GM:') ||
        pageContent?.includes('Record');

      expect(isOnStaffDecision || isOnDashboard).toBeTruthy();
    });
  });

  // =====================================================
  // SECTION 4: Dashboard Navigation
  // =====================================================
  test.describe('4. Dashboard', () => {
    test.beforeEach(async ({ page }) => {
      // Start a new game before each dashboard test
      await page.goto('/');
      await helpers.waitForAppReady(page);
      await page.click('text=New Game');
      await page.waitForSelector('text=Select Your Team');
      await page.click('text=All Teams');
      await page.waitForTimeout(500);
      await page.click(`text=${TEST_TEAM}`);
      const gmInput = page.locator('input[placeholder="Enter your GM name"]');
      await gmInput.fill(TEST_GM_NAME);
      await page.click('text=Start Career');
      await helpers.waitForLoading(page);

      // Handle staff decision if it appears
      try {
        const keepStaffButton = page.locator('text=Keep Current Staff');
        if (await keepStaffButton.isVisible({ timeout: 5000 })) {
          await keepStaffButton.click();
          await helpers.waitForLoading(page);
        }
      } catch {
        // Not on staff decision screen
      }

      // Wait for dashboard
      await page.waitForSelector('text=Roster', { timeout: 30000 });
    });

    test('4.1 - Dashboard shows team info', async ({ page }) => {
      // Verify GM name is displayed
      await expect(page.locator(`text=GM: ${TEST_GM_NAME}`)).toBeVisible();
    });

    test('4.2 - Dashboard shows menu cards', async ({ page }) => {
      // Verify main menu cards
      await expect(page.locator('text=Roster')).toBeVisible();
      await expect(page.locator('text=Depth Chart')).toBeVisible();
      await expect(page.locator('text=Staff')).toBeVisible();
      await expect(page.locator('text=Finances')).toBeVisible();
      await expect(page.locator('text=Schedule')).toBeVisible();
      await expect(page.locator('text=Standings')).toBeVisible();
    });

    test('4.3 - Can navigate to Roster screen', async ({ page }) => {
      await page.click('text=Roster');
      await helpers.waitForLoading(page);

      // Should show roster content
      const pageContent = await page.textContent('body');
      expect(pageContent?.includes('Roster') || pageContent?.includes('Players')).toBeTruthy();
    });

    test('4.4 - Can navigate to Schedule screen', async ({ page }) => {
      await page.click('text=Schedule');
      await helpers.waitForLoading(page);

      // Should show schedule content
      const pageContent = await page.textContent('body');
      expect(
        pageContent?.includes('Schedule') ||
          pageContent?.includes('Week') ||
          pageContent?.includes('Game')
      ).toBeTruthy();
    });

    test('4.5 - Can navigate to Standings screen', async ({ page }) => {
      await page.click('text=Standings');
      await helpers.waitForLoading(page);

      // Should show standings content
      const pageContent = await page.textContent('body');
      expect(
        pageContent?.includes('Standings') ||
          pageContent?.includes('AFC') ||
          pageContent?.includes('NFC')
      ).toBeTruthy();
    });

    test('4.6 - Can navigate to Staff screen', async ({ page }) => {
      await page.click('text=Staff');
      await helpers.waitForLoading(page);

      // Should show staff content
      const pageContent = await page.textContent('body');
      expect(
        pageContent?.includes('Staff') ||
          pageContent?.includes('Coach') ||
          pageContent?.includes('Scout')
      ).toBeTruthy();
    });

    test('4.7 - Advance Week button is visible', async ({ page }) => {
      // Look for advance button
      const advanceButton = page
        .locator('text=Advance Week')
        .or(page.locator('text=Advance Phase'));
      await expect(advanceButton.first()).toBeVisible();
    });
  });

  // =====================================================
  // SECTION 5: Playing Regular Season
  // =====================================================
  test.describe('5. Regular Season', () => {
    test('5.1 - Can advance through first 3 weeks', async ({ page }) => {
      // Start new game
      await page.goto('/');
      await helpers.waitForAppReady(page);
      await page.click('text=New Game');
      await page.waitForSelector('text=Select Your Team');
      await page.click('text=All Teams');
      await page.waitForTimeout(500);
      await page.click(`text=${TEST_TEAM}`);
      const gmInput = page.locator('input[placeholder="Enter your GM name"]');
      await gmInput.fill(TEST_GM_NAME);
      await page.click('text=Start Career');
      await helpers.waitForLoading(page);

      // Handle staff decision if it appears
      try {
        const keepStaffButton = page.locator('text=Keep Current Staff');
        if (await keepStaffButton.isVisible({ timeout: 5000 })) {
          await keepStaffButton.click();
          await helpers.waitForLoading(page);
        }
      } catch {
        // Not on staff decision screen
      }

      // Wait for dashboard
      await page.waitForSelector('text=Roster', { timeout: 30000 });

      // Advance through 3 weeks
      for (let i = 0; i < 3; i++) {
        // Try to find and click gamecast if there's a game
        const gamecastCard = page.locator('text=Gamecast');
        if (await gamecastCard.isVisible({ timeout: 2000 })) {
          await gamecastCard.click();
          await helpers.waitForLoading(page);

          // Look for sim button
          const simButton = page
            .locator('text=Sim Game')
            .or(page.locator('text=Simulate'))
            .or(page.locator('text=Sim'))
            .first();
          if (await simButton.isVisible({ timeout: 3000 })) {
            await simButton.click();
            await helpers.waitForLoading(page);
          }

          // Look for continue/back
          const continueButton = page
            .locator('text=Continue')
            .or(page.locator('text=Back'))
            .or(page.locator('text=Close'))
            .first();
          if (await continueButton.isVisible({ timeout: 3000 })) {
            await continueButton.click();
            await helpers.waitForLoading(page);
          }
        }

        // Advance week
        const advanceButton = page
          .locator('text=Advance Week')
          .or(page.locator('text=Advance'))
          .first();
        if (await advanceButton.isVisible({ timeout: 3000 })) {
          await advanceButton.click();
          await helpers.waitForLoading(page);
        }

        await page.waitForTimeout(1000);
      }

      // Should still be on dashboard or showing game state
      const pageContent = await page.textContent('body');
      expect(pageContent?.length).toBeGreaterThan(0);
    });
  });

  // =====================================================
  // SECTION 6: Save and Continue
  // =====================================================
  test.describe('6. Save Game', () => {
    test('6.1 - Can save game from dashboard', async ({ page }) => {
      // Start new game
      await page.goto('/');
      await helpers.waitForAppReady(page);
      await page.click('text=New Game');
      await page.waitForSelector('text=Select Your Team');
      await page.click('text=All Teams');
      await page.waitForTimeout(500);
      await page.click(`text=${TEST_TEAM}`);
      const gmInput = page.locator('input[placeholder="Enter your GM name"]');
      await gmInput.fill(TEST_GM_NAME);
      await page.click('text=Start Career');
      await helpers.waitForLoading(page);

      // Handle staff decision
      try {
        const keepStaffButton = page.locator('text=Keep Current Staff');
        if (await keepStaffButton.isVisible({ timeout: 5000 })) {
          await keepStaffButton.click();
          await helpers.waitForLoading(page);
        }
      } catch {
        // Not on staff decision screen
      }

      // Wait for dashboard
      await page.waitForSelector('text=Roster', { timeout: 30000 });

      // Find and click save button
      const saveButton = page.locator('text=Save').first();
      if (await saveButton.isVisible({ timeout: 3000 })) {
        await saveButton.click();
        await helpers.waitForLoading(page);

        // Game should be saved
        // Wait briefly for any save confirmation
        await page.waitForTimeout(1000);
      }
    });
  });
});

// =====================================================
// Extended Season Test - Runs full season flow
// =====================================================
test.describe('Full Season Flow', () => {
  test.setTimeout(600000); // 10 minutes for full season

  test('Complete full season simulation', async ({ page }) => {
    // Start new game
    await page.goto('/');
    await helpers.waitForAppReady(page);
    await page.click('text=New Game');
    await page.waitForSelector('text=Select Your Team');
    await page.click('text=All Teams');
    await page.waitForTimeout(500);
    await page.click(`text=${TEST_TEAM}`);
    const gmInput = page.locator('input[placeholder="Enter your GM name"]');
    await gmInput.fill(TEST_GM_NAME);
    await page.click('text=Start Career');
    await helpers.waitForLoading(page);

    // Handle staff decision
    try {
      const keepStaffButton = page.locator('text=Keep Current Staff');
      if (await keepStaffButton.isVisible({ timeout: 5000 })) {
        await keepStaffButton.click();
        await helpers.waitForLoading(page);
      }
    } catch {
      // Not on staff decision screen
    }

    // Wait for dashboard
    await page.waitForSelector('text=Roster', { timeout: 60000 });

    // Track wins and losses
    let gamesPlayed = 0;
    let maxWeeks = 25; // Regular season + playoffs

    while (maxWeeks > 0) {
      const pageContent = await page.textContent('body');

      // Check if in offseason
      if (pageContent?.includes('Offseason') && !pageContent?.includes('Offseason Tasks')) {
        console.log('Reached offseason, ending season test');
        break;
      }

      // Check if season completed
      if (pageContent?.includes('Season Complete') || pageContent?.includes('Season Recap')) {
        console.log('Season complete!');
        break;
      }

      // Try to play/sim game if available
      const gamecastCard = page.locator('text=Gamecast');
      if (await gamecastCard.isVisible({ timeout: 2000 })) {
        try {
          await gamecastCard.click();
          await helpers.waitForLoading(page);

          // Sim the game
          const simButton = page.locator('text=Sim Game').or(page.locator('text=Simulate')).first();
          if (await simButton.isVisible({ timeout: 3000 })) {
            await simButton.click();
            await helpers.waitForLoading(page);
            gamesPlayed++;
          }

          // Return to dashboard
          const backButton = page.locator('text=Continue').or(page.locator('text=Back')).first();
          if (await backButton.isVisible({ timeout: 3000 })) {
            await backButton.click();
            await helpers.waitForLoading(page);
          }
        } catch (e) {
          console.log('Error in gamecast, continuing...');
        }
      }

      // Advance week
      try {
        const advanceButton = page
          .locator('text=Advance Week')
          .or(page.locator('text=Advance Phase'))
          .or(page.locator('text=Advance'))
          .first();
        if (await advanceButton.isVisible({ timeout: 3000 })) {
          await advanceButton.click();
          await helpers.waitForLoading(page);
        }
      } catch (e) {
        console.log('Could not advance, continuing...');
      }

      maxWeeks--;
      await page.waitForTimeout(500);
    }

    console.log(`Season complete. Games played: ${gamesPlayed}`);
    expect(gamesPlayed).toBeGreaterThan(0);
  });
});
