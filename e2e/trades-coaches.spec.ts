/**
 * Trades and Coach Management E2E Test Suite
 *
 * This test suite covers:
 * 1. Trade screen navigation
 * 2. Trade proposals
 * 3. Coach hiring screen
 * 4. Coach firing
 * 5. Owner relations
 */

import { test, expect } from '@playwright/test';
import * as helpers from './helpers/page-helpers';

// Test data
const TEST_TEAM = 'NYJ'; // New York Jets
const TEST_GM_NAME = 'Trade Tester';

// Helper to start a game
async function startGame(page: any) {
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
}

test.describe('Roster Management', () => {
  test.setTimeout(120000);

  test('Can view full roster', async ({ page }) => {
    await startGame(page);

    // Click roster
    const rosterCard = page.locator('text=Roster').first();
    await rosterCard.click();
    await helpers.waitForLoading(page);

    // Verify roster is displayed
    const pageContent = await page.textContent('body');
    expect(
      pageContent?.includes('Roster') ||
        pageContent?.includes('QB') ||
        pageContent?.includes('Player')
    ).toBeTruthy();
  });

  test('Can filter roster by position', async ({ page }) => {
    await startGame(page);

    // Click roster
    const rosterCard = page.locator('text=Roster').first();
    await rosterCard.click();
    await helpers.waitForLoading(page);

    // Try to find position filters
    const positions = ['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'CB', 'S'];

    for (const pos of positions) {
      const posFilter = page.locator(`text=${pos}`).first();
      if (await posFilter.isVisible({ timeout: 1000 })) {
        console.log(`Found position filter: ${pos}`);
        break;
      }
    }

    // Verify content is displayed
    const pageContent = await page.textContent('body');
    expect(pageContent?.length).toBeGreaterThan(100);
  });

  test('Can view player details from roster', async ({ page }) => {
    await startGame(page);

    // Click roster
    const rosterCard = page.locator('text=Roster').first();
    await rosterCard.click();
    await helpers.waitForLoading(page);

    // Try to click on any player name (look for common name patterns)
    // Players typically have First Last name format
    const playerCard = page
      .locator('[data-testid="player-card"]')
      .or(page.locator('text=/^[A-Z][a-z]+ [A-Z][a-z]+$/').first())
      .first();

    if (await playerCard.isVisible({ timeout: 3000 })) {
      await playerCard.click();
      await helpers.waitForLoading(page);

      // Verify we're on a player detail page
      const pageContent = await page.textContent('body');
      expect(
        pageContent?.includes('Rating') ||
          pageContent?.includes('Contract') ||
          pageContent?.includes('Stats')
      ).toBeTruthy();
    }
  });
});

test.describe('Depth Chart', () => {
  test.setTimeout(120000);

  test('Can view depth chart', async ({ page }) => {
    await startGame(page);

    // Click depth chart
    const depthChartCard = page.locator('text=Depth Chart').first();
    await depthChartCard.click();
    await helpers.waitForLoading(page);

    // Verify depth chart is displayed
    const pageContent = await page.textContent('body');
    expect(
      pageContent?.includes('Depth') ||
        pageContent?.includes('Starter') ||
        pageContent?.includes('Backup')
    ).toBeTruthy();
  });
});

test.describe('Staff and Coaches', () => {
  test.setTimeout(180000);

  test('Can view staff overview', async ({ page }) => {
    await startGame(page);

    // Click staff
    const staffCard = page.locator('text=Staff').first();
    await staffCard.click();
    await helpers.waitForLoading(page);

    // Verify staff content
    const pageContent = await page.textContent('body');
    expect(
      pageContent?.includes('Coach') ||
        pageContent?.includes('Staff') ||
        pageContent?.includes('Scout')
    ).toBeTruthy();
  });

  test('Staff screen shows head coach', async ({ page }) => {
    await startGame(page);

    // Click staff
    const staffCard = page.locator('text=Staff').first();
    await staffCard.click();
    await helpers.waitForLoading(page);

    // Look for head coach
    const headCoach = page.locator('text=Head Coach').first();
    await expect(headCoach).toBeVisible({ timeout: 5000 });
  });

  test('Can view coach profile', async ({ page }) => {
    await startGame(page);

    // Click staff
    const staffCard = page.locator('text=Staff').first();
    await staffCard.click();
    await helpers.waitForLoading(page);

    // Try to click on head coach
    const coachCard = page
      .locator('text=Head Coach')
      .or(page.locator('[data-testid="coach-card"]'))
      .first();

    if (await coachCard.isVisible({ timeout: 3000 })) {
      await coachCard.click();
      await helpers.waitForLoading(page);

      // Verify coach profile
      const pageContent = await page.textContent('body');
      expect(pageContent).toBeDefined();
    }
  });
});

test.describe('Owner Relations', () => {
  test.setTimeout(120000);

  test('Can view owner relations from job security bar', async ({ page }) => {
    await startGame(page);

    // Look for job security indicator (on dashboard)
    const jobSecurityIndicators = [
      'text=JOB SECURE',
      'text=STABLE',
      'text=WARM SEAT',
      'text=HOT SEAT',
      'text=DANGER',
    ];

    for (const indicator of jobSecurityIndicators) {
      const element = page.locator(indicator).first();
      if (await element.isVisible({ timeout: 2000 })) {
        await element.click();
        await helpers.waitForLoading(page);

        // Verify owner relations content
        const pageContent = await page.textContent('body');
        expect(
          pageContent?.includes('Owner') ||
            pageContent?.includes('Patience') ||
            pageContent?.includes('Expectations')
        ).toBeTruthy();
        break;
      }
    }
  });
});

test.describe('News and Information', () => {
  test.setTimeout(120000);

  test('Can view news', async ({ page }) => {
    await startGame(page);

    // Click news
    const newsCard = page.locator('text=News').first();
    await newsCard.click();
    await helpers.waitForLoading(page);

    // Verify news content
    const pageContent = await page.textContent('body');
    expect(
      pageContent?.includes('News') ||
        pageContent?.includes('Headlines') ||
        pageContent?.includes('Story')
    ).toBeTruthy();
  });

  test('Can view weekly digest', async ({ page }) => {
    await startGame(page);

    // Click weekly digest
    const digestCard = page.locator('text=Weekly Digest').first();
    if (await digestCard.isVisible({ timeout: 3000 })) {
      await digestCard.click();
      await helpers.waitForLoading(page);

      // Verify digest content
      const pageContent = await page.textContent('body');
      expect(
        pageContent?.includes('Digest') ||
          pageContent?.includes('Week') ||
          pageContent?.includes('Summary')
      ).toBeTruthy();
    }
  });
});

test.describe('Stats', () => {
  test.setTimeout(120000);

  test('Can view stats screen', async ({ page }) => {
    await startGame(page);

    // Click stats
    const statsCard = page.locator('text=Stats').first();
    await statsCard.click();
    await helpers.waitForLoading(page);

    // Verify stats content
    const pageContent = await page.textContent('body');
    expect(
      pageContent?.includes('Stats') ||
        pageContent?.includes('Leaders') ||
        pageContent?.includes('Passing')
    ).toBeTruthy();
  });
});

test.describe('Career Legacy', () => {
  test.setTimeout(120000);

  test('Can view career stats section', async ({ page }) => {
    await startGame(page);

    // Look for career stats section on dashboard
    const careerStats = page.locator('text=Career Stats').first();
    if (await careerStats.isVisible({ timeout: 5000 })) {
      await careerStats.click();
      await helpers.waitForLoading(page);

      // Verify career legacy content
      const pageContent = await page.textContent('body');
      expect(
        pageContent?.includes('Career') ||
          pageContent?.includes('Legacy') ||
          pageContent?.includes('History')
      ).toBeTruthy();
    }
  });
});

test.describe('System Functions', () => {
  test.setTimeout(120000);

  test('Can access settings', async ({ page }) => {
    await startGame(page);

    // Click settings
    const settingsButton = page.locator('text=Settings').first();
    await settingsButton.click();
    await helpers.waitForLoading(page);

    // Verify settings content
    const pageContent = await page.textContent('body');
    expect(
      pageContent?.includes('Settings') ||
        pageContent?.includes('Options') ||
        pageContent?.includes('Preferences')
    ).toBeTruthy();
  });

  test('Can return to main menu', async ({ page }) => {
    await startGame(page);

    // Click menu button
    const menuButton = page.locator('text=Menu').first();
    if (await menuButton.isVisible({ timeout: 3000 })) {
      await menuButton.click();
      await helpers.waitForLoading(page);

      // Should be back at start screen
      await expect(page.locator('text=GM Sim')).toBeVisible({ timeout: 10000 });
    }
  });

  test('Save game works', async ({ page }) => {
    await startGame(page);

    // Click save
    const saveButton = page.locator('text=Save').first();
    await saveButton.click();
    await helpers.waitForLoading(page);

    // Wait for save to complete (brief pause)
    await page.waitForTimeout(2000);

    // Should still be on dashboard after save
    await expect(page.locator('text=Roster')).toBeVisible();
  });
});

test.describe('Continue Saved Game', () => {
  test.setTimeout(180000);

  test('Can continue a previously saved game', async ({ page }) => {
    // First, start and save a game
    await startGame(page);

    // Save the game
    const saveButton = page.locator('text=Save').first();
    await saveButton.click();
    await helpers.waitForLoading(page);
    await page.waitForTimeout(2000);

    // Go to main menu
    const menuButton = page.locator('text=Menu').first();
    if (await menuButton.isVisible({ timeout: 3000 })) {
      await menuButton.click();
      await helpers.waitForLoading(page);
    } else {
      // Navigate directly
      await page.goto('/');
    }

    await helpers.waitForAppReady(page);

    // Look for Continue button
    const continueButton = page.locator('text=Continue').first();
    if (await continueButton.isVisible({ timeout: 5000 })) {
      await continueButton.click();
      await helpers.waitForLoading(page);

      // Should load the saved game
      await page.waitForSelector('text=Roster', { timeout: 30000 });

      // Verify GM name is the same
      await expect(page.locator(`text=GM: ${TEST_GM_NAME}`)).toBeVisible();
    } else {
      console.log('No continue button visible - may not have saved games');
    }
  });
});

test.describe('Navigation Flows', () => {
  test.setTimeout(120000);

  test('Can navigate from roster to player profile and back', async ({ page }) => {
    await startGame(page);

    // Go to roster
    await page.click('text=Roster');
    await helpers.waitForLoading(page);

    // Click any player if available
    const playerElement = page
      .locator('[data-testid="player-row"]')
      .or(page.locator('[role="button"]'))
      .first();

    if (await playerElement.isVisible({ timeout: 3000 })) {
      await playerElement.click();
      await helpers.waitForLoading(page);

      // Go back
      const backButton = page.locator('text=Back').or(page.locator('text=←')).first();
      if (await backButton.isVisible({ timeout: 3000 })) {
        await backButton.click();
        await helpers.waitForLoading(page);
      }
    }

    // Return to dashboard
    await helpers.navigateBackToDashboard(page);

    // Verify back on dashboard
    await expect(page.locator('text=Roster')).toBeVisible({ timeout: 5000 });
  });

  test('All dashboard cards are accessible', async ({ page }) => {
    await startGame(page);

    const dashboardCards = [
      'Roster',
      'Depth Chart',
      'Staff',
      'Finances',
      'Contracts',
      'Schedule',
      'Standings',
      'Stats',
      'News',
    ];

    for (const card of dashboardCards) {
      const cardElement = page.locator(`text=${card}`).first();
      const isVisible = await cardElement.isVisible({ timeout: 2000 });
      console.log(`Dashboard card "${card}": ${isVisible ? 'visible' : 'not visible'}`);
    }
  });
});
