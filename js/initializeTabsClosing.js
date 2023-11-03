export { initializeTabsClosing };

async function initializeTabsClosing(tabsToClose) {
  const tabIdsToClose = await tabsToClose.map((tab) => tab.id);
  await browser.tabs.remove(tabIdsToClose);

  return true;
}
