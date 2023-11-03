export { initializeTabsClosing };

/**
 * @param {Array} tabsToClose
 */
async function initializeTabsClosing(tabsToClose) {
  const tabIdsToClose = tabsToClose.map((tab) => tab.id);
  await browser.tabs.remove(tabIdsToClose);

  return true;
}
