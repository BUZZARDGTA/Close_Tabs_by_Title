document.addEventListener("DOMContentLoaded", async function () {
  const titleInput = document.getElementById("titleInput");
  const closeTabsButton = document.getElementById("closeTabsButton");
  const resultMessage = document.getElementById("resultMessage");
  const openTabsCounter = document.getElementById("openTabsCounter");

  closeTabsButton.addEventListener("click", async () => {
    const inputText = titleInput.value.trim(); // Remove leading and trailing whitespace
    if (inputText === "") {
      return; // Exit the function if input is empty
    }

    closeTabsButton.disabled = true; // Disable the button while processing
    closeTabsButton.style.backgroundColor = "blue"; // Set button color to blue
    resultMessage.textContent = "Loading..."; // Show loading message

    const regex = new RegExp(inputText, "i"); // Case-insensitive regex
    let tabsClosedCount = 0;
    let totalTabsToClose = 0; // Count of tabs that match the search criteria
    let closedTabsInfo = []; // Array to store closed tabs' info

    // Query the updated list of tabs every time the button is clicked
    const tabs = await browser.tabs.query({});
    const totalTabsCount = tabs.length;

    // Calculate the total count of tabs to close
    for (const tab of tabs) {
      if (regex.test(tab.title)) {
        totalTabsToClose++;
      }
    }

    // Update result message to show the total count of tabs to close
    resultMessage.textContent = `Closing ${totalTabsToClose} tabs...`;

    for (const tab of tabs) {
      if (regex.test(tab.title)) {
        await browser.tabs.remove(tab.id);
        tabsClosedCount++;

        // Store closed tabs' info
        closedTabsInfo.push({ url: tab.url, title: tab.title });

        // Display progress in the loading message
        resultMessage.textContent = `Closing ${tabsClosedCount} of ${totalTabsToClose} tabs...`;
      }
    }

    // Update the open tabs counter after closing tabs
    const updatedTabs = await browser.tabs.query({});
    openTabsCounter.textContent = updatedTabs.length;

    let message = "";
    let buttonColor = "";

    if (tabsClosedCount > 0) {
      message = `${tabsClosedCount} ${tabsClosedCount === 1 ? "tab" : "tabs"} with matching title closed.`;
      buttonColor = "green";
    } else if (updatedTabs.length === 0) {
      message = "No open tabs to close.";
      buttonColor = "red";
    } else {
      message = "No tabs with matching title found.";
      buttonColor = "red";
    }

    // Log closed tabs' info to the console
    console.log("Closed tabs:", closedTabsInfo);

    // Display the result message and set button color
    resultMessage.textContent = message;
    closeTabsButton.style.backgroundColor = buttonColor;
    closeTabsButton.disabled = false; // Re-enable the button
  });

  // Initial update of open tabs counter
  const initialTabs = await browser.tabs.query({});
  openTabsCounter.textContent = initialTabs.length;
});
