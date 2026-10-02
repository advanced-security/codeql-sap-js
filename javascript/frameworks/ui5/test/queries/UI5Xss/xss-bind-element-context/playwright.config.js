const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./runtime",
  timeout: 30000,
  use: {
    baseURL: "http://127.0.0.1:8085",
    headless: true
  },
  webServer: {
    command: "npm run start",
    url: "http://127.0.0.1:8085/index.html",
    reuseExistingServer: true,
    timeout: 120000
  },
  projects: [
    {
      name: "chromium",
      use: {
        browserName: "chromium"
      }
    }
  ]
});
