const { test, expect } = require('@playwright/test');
const path = require('node:path');

// Use a known word while exercising the actual page, scripts, and DOM.
test.beforeEach(async ({ page }) => {
  await page.goto('file://' + path.resolve('index.html'));
  await page.evaluate(() => {
    WORDS.splice(0, WORDS.length,
      { word: 'apple', pos: 'noun', definition: 'A fruit.', level: 'easy' },
      { word: 'banana', pos: 'noun', definition: 'A fruit.', level: 'medium' });
    entry = null;
    newGame();
    Math.random = () => 0.3;
  });
});

test('reveal completes a win, stops at round end, and resets for new games and difficulty changes', async ({ page }) => {
  const reveal = page.getByRole('button', { name: 'Show Letter', exact: true });
  for (let i = 0; i < 4; i++) await reveal.click();
  await expect(page.locator('#message')).toContainText('You got it!');
  await expect(reveal).toBeDisabled();
  await page.getByRole('button', { name: 'New game' }).click();
  await expect(reveal).toBeEnabled();
  await expect(page.locator('#word .shown')).toHaveCount(0);
  await page.getByRole('button', { name: 'Medium', exact: true }).click();
  await expect(reveal).toBeEnabled();
  await expect(page.locator('#word .slot')).toHaveCount(6);
  await reveal.click();
  await expect(page.locator('#word .shown')).toHaveCount(1);
});

test('Show Letter is disabled after a loss', async ({ page }) => {
  for (const ch of 'bcdfghij') {
    await page.getByRole('button', { name: 'Guess ' + ch.toUpperCase(), exact: true }).click();
  }
  await expect(page.locator('#message')).toContainText('Out of guesses');
  await expect(page.getByRole('button', { name: 'Show Letter', exact: true })).toBeDisabled();
});

test('Show Letter reveals a random hidden letter beside Show hint without a penalty', async ({ page }) => {
  const reveal = page.getByRole('button', { name: 'Show Letter', exact: true });
  await expect(reveal).toBeVisible();
  const hintBox = await page.locator('#hint-btn').boundingBox();
  const revealBox = await reveal.boundingBox();
  expect(Math.abs(hintBox.y - revealBox.y)).toBeLessThan(2);
  expect(revealBox.x).toBeGreaterThan(hintBox.x);
  await reveal.click();
  await expect(page.locator('#word')).toHaveAttribute('aria-label', 'Word: blank P P blank blank');
  await expect(page.getByRole('button', { name: 'P, in the word', exact: true })).toBeDisabled();
  await expect(page.locator('#wrong-text')).toHaveText('0 of 8 used');
  await reveal.click();
  await expect(page.locator('#word')).toHaveAttribute('aria-label', 'Word: A P P blank blank');
});
