const { test, expect } = require("@playwright/test");

function markerInSink(page, sinkId) {
  return page.locator(
    `[id$="${sinkId}"][data-xss-marker="true"], [id$="${sinkId}"] [data-xss-marker="true"]`
  );
}

test("renders input through the bindElement context without sanitization", async ({ page }) => {
  await page.goto("/index.html");

  const input = page.locator('[id$="payloadInput-inner"]');
  await expect(input).toHaveValue("Safe value");

  await input.fill('<span data-xss-marker="true">injected</span>');
  await input.blur();

  for (const sinkId of ["htmlSink", "legacySink", "objectSink"]) {
    await expect(markerInSink(page, sinkId)).toHaveText("injected");
  }

  for (const sinkId of [
    "namedSink",
    "nestedSink",
    "aggregationSink",
    "namedObjectSink",
    "namedPathSink",
    "siblingSink"
  ]) {
    await expect(markerInSink(page, sinkId)).toHaveCount(0);
  }
});
