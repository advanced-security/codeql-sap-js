const { test, expect } = require("@playwright/test");

test("renders input through the bindElement context without sanitization", async ({ page }) => {
  await page.goto("/index.html");

  const input = page.locator('[id$="payloadInput-inner"]');
  await expect(input).toHaveValue("Safe value");

  await input.fill('<span data-xss-marker="true">injected</span>');
  await input.blur();

  const markers = page.locator('[data-xss-marker="true"]');
  await expect(markers).toHaveCount(3);
  await expect(markers).toHaveText(["injected", "injected", "injected"]);
});
