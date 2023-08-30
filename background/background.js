// Listen for incoming messages from the extension's UI "Close Tabs" button pressed
browser.runtime.onMessage.addListener(async (message) => {
  if (await message.action !== "closeTabs") {
    return false;
  }

  const tabsToClose = message.tabsToClose;
  const tabIdsToClose = await tabsToClose.map((tab) => tab.id);
  await browser.tabs.remove(tabIdsToClose);

  return true;
});
