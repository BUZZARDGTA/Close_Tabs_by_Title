export { handleSettingChange };

/**
 * @param {object} changes
 * @param {string} areaName
 * @param {object} settingElements
 */
function handleSettingChange(changes, areaName, settingElements) {
  if (areaName !== "local") {
    return;
  }
  for (const settingKey in settingElements) {
    if (changes.hasOwnProperty(settingKey)) {
      const newValue = changes[settingKey].newValue;
      settingElements[settingKey].checked = newValue;
    }
  }
}
