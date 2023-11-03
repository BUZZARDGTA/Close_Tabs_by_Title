export { initializeTabsClosing };

/**
 * @param {Array} tabsToClose
 */
function initializeTabsClosing(tabsToClose) {
  const tabIdsToClose = tabsToClose.map((tab) => tab.id);
  return browser.tabs.remove(tabIdsToClose);
}
