import { retrieveSettings } from "/js/retrieveSettings.js";
import { saveSettings } from "/js/saveSettings.js";
import { handleSettingChange } from "/js/handleSettingChange.js";

document.addEventListener("DOMContentLoaded", async function () {
  const checkboxPreserveTabsByTitle = document.getElementById("checkboxPreserveTabsByTitle");
  const checkboxInsensitiveTabSearch = document.getElementById("checkboxInsensitiveTabSearch");
  const checkboxWhitelistFirefoxReservedTabs = document.getElementById("checkboxWhitelistFirefoxReservedTabs");

  // This initialize HTML checkboxes to match internal storage values.
  // Subsequently, the HTML interface enables users to toggle checkboxes, and event listeners respond to these.
  const currentSettings = await retrieveSettings();
  checkboxPreserveTabsByTitle.checked = typeof currentSettings.preserveTabsByTitle === "boolean" ? currentSettings.preserveTabsByTitle : false;
  checkboxInsensitiveTabSearch.checked = typeof currentSettings.insensitiveSearch === "boolean" ? currentSettings.insensitiveSearch : false;
  checkboxWhitelistFirefoxReservedTabs.checked = typeof currentSettings.whitelistFirefoxReservedTabs === "boolean" ? currentSettings.whitelistFirefoxReservedTabs : false;

  browser.storage.onChanged.addListener((changes, areaName) => {
    handleSettingChange(changes, areaName, {
      preserveTabsByTitle: checkboxPreserveTabsByTitle,
      insensitiveSearch: checkboxInsensitiveTabSearch,
      whitelistFirefoxReservedTabs: checkboxWhitelistFirefoxReservedTabs,
    });
  });

  // Add event listeners for checkbox changes on the HTML settings page
  addCheckboxChangeListener(checkboxPreserveTabsByTitle, "preserveTabsByTitle");
  addCheckboxChangeListener(checkboxInsensitiveTabSearch, "insensitiveSearch");
  addCheckboxChangeListener(checkboxWhitelistFirefoxReservedTabs, "whitelistFirefoxReservedTabs");

  /**
   * @param {HTMLElement} checkboxHtmlId
   * @param {string} localStorageKey
   */
  function addCheckboxChangeListener(checkboxHtmlId, localStorageKey) {
    checkboxHtmlId.addEventListener("change", async () => {
      const settingsObj = { [localStorageKey]: checkboxHtmlId.checked }; // Create a settings object with a dynamic key based on localStorageKey and set its value to the checked state of the checkbox element
      await saveSettings(settingsObj); // Saving the settings based on checkbox changes
    });
  }
});
