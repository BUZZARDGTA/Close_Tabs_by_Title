import {retrieveSettings, saveSettings} from "../shared/shared_functions.js";

document.addEventListener("DOMContentLoaded", async function () {

  const checkboxInsensitiveTabSearch = document.getElementById("checkboxInsensitiveTabSearch");
  const checkboxWhitelistFirefoxReservedTabs = document.getElementById("checkboxWhitelistFirefoxReservedTabs");


  /*
  This initialize HTML checkboxes to match internal storage values.
  Subsequently, the HTML interface enables users to toggle checkboxes, and event listeners respond to these.
  */
  const currentSettings = await retrieveSettings();
  checkboxInsensitiveTabSearch.checked = typeof currentSettings.sensitiveSearch === 'boolean' ? currentSettings.sensitiveSearch : false;
  checkboxWhitelistFirefoxReservedTabs.checked = typeof currentSettings.whitelistFirefoxReservedTabs === 'boolean' ? currentSettings.whitelistFirefoxReservedTabs : false;

  // Add event listeners for checkbox changes on the HTML settings page
  addCheckboxChangeListener(checkboxInsensitiveTabSearch, "sensitiveSearch");
  addCheckboxChangeListener(checkboxWhitelistFirefoxReservedTabs, "whitelistFirefoxReservedTabs");


  function addCheckboxChangeListener(checkboxHtmlId, localStorageKey) {
    checkboxHtmlId.addEventListener("change", async () => {
      const settingsObj = { [localStorageKey]: checkboxHtmlId.checked }; // Create a settings object with a dynamic key based on localStorageKey and set its value to the checked state of the checkbox element
      await saveSettings(settingsObj); // Saving the settings based on checkbox changes
    });
  }

});
