// Package only manifest.json and src/. Keep release tools and fixtures out.
module.exports = {
  ignoreFiles: [
    ".*", "**/.*", "node_modules/**", "tests", "tests/**", "tools", "tools/**", "*.md",
    "package*.json", "updates.json", "web-ext-artifacts/**"
  ]
};
