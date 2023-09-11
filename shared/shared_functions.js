export { retrieveSettings, saveSettings };

// Retrieve settings from local storage
async function retrieveSettings(settingsToRetrieve) {
  const settings = await browser.storage.local.get(settingsToRetrieve);
  return settings;
}

// Save setting
async function saveSettings(settingsToSave) {
  await browser.storage.local.set(settingsToSave);
}
