export { retrieveSettings, saveSettings };

// Retrieve settings from local storage
async function retrieveSettings() {
  const settings = await browser.storage.local.get();
  return settings;
}

// Save setting
async function saveSettings(settingsToSave) {
  await browser.storage.local.set(settingsToSave);
}
