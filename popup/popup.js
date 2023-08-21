document.addEventListener("DOMContentLoaded", async function () {
  const titleInput = document.getElementById("titleInput");
  const closeTabsButton = document.getElementById("closeTabsButton");
  const resultMessage = document.getElementById("resultMessage");
  const openTabsCounter = document.getElementById("openTabsCounter");

  // Automatically focus on the title input field when the extension icon is clicked
  titleInput.focus();

  // Add a keydown event listener to the titleInput
  titleInput.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
      closeTabsButton.click(); // Programmatically trigger a click on the closeTabsButton
    }
  });

  // Add a click event listener to the titleInput
  closeTabsButton.addEventListener("click", async () => {
    const inputText = titleInput.value.trim(); // Remove leading and trailing whitespace
    if (inputText === "") {
      resultMessage.textContent = "Please enter a title regular expression and try again.";
      resultMessage.style.color = "red"; // Set text color to red
      closeTabsButton.style.backgroundColor = "red"; // Set button color to red
      return; // Exit the function if input is empty
    }

    // Define a regular expression of disallowed input values for "code crashing"
    let disallowedInputs__codeCrashing = /^(((\[|\*|\?|\+)+)|(\\|\\\\\\|\\\\\\\\\\))$/; // TODO: Add support to \, \\\, \\\\\, etc... I currently only added support for 3 repetitions max. Above 3 will lead to the unexpected behavior.

    // Check if the inputText contains disallowed input values, which would results in a code crashing
    if (disallowedInputs__codeCrashing.test(inputText)) {
      resultMessage.textContent = "Please enter a valid title regular expression and try again.";
      resultMessage.style.color = "red"; // Set text color to red
      closeTabsButton.style.backgroundColor = "red"; // Set button color to red
      return; // Exit the function if input is invalid
    }

    // Define a regular expression of disallowed input values for "close all tabs"
    let disallowedInputs__closeAllTabs = /^(((\||\.|\^|\$|\(\))+)|(\/))$/;

    // Check if the inputText contains disallowed input values, which would results in closing all tabs
    if (disallowedInputs__closeAllTabs.test(inputText)) {
      resultMessage.innerHTML  = `The regular expression you entered would be closing all opened tabs.<br><br>Perhaps, if you really want that, use the following regular expression: <span style="color: blue;">^.*$</span>`;
      resultMessage.style.color = "red"; // Set text color to red
      closeTabsButton.style.backgroundColor = "red"; // Set button color to red
      return; // Exit the function if input is invalid
    }

    closeTabsButton.disabled = true; // Disable the button while processing
    closeTabsButton.style.backgroundColor = "blue"; // Set button color to blue
    resultMessage.textContent = "Loading..."; // Show loading message
    resultMessage.style.color = "white"; // Reset text color to white

    const regex = new RegExp(inputText, "i"); // Case-insensitive regex
    let tabsClosedCount = 0; // Initialize a counter to keep track of the number of tabs that have been closed
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
    resultMessage.textContent = `Closing ${tabsClosedCount} of ${totalTabsToClose} tabs...`;

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
      message = `${tabsClosedCount} ${tabsClosedCount === 1 ? "tab" : "tabs"} with a matching title have been closed out of ${totalTabsCount} ${totalTabsCount === 1 ? "tab" : "tabs"}.`;
      buttonColor = "green";
    } else if (updatedTabs.length === 0) {
      message = "No open tabs to close.";
      resultMessage.style.color = "red"; // Set text color to red
      buttonColor = "red";
    } else {
      message = "No tabs with matching title found.";
      resultMessage.style.color = "red"; // Set text color to red
      buttonColor = "red";
    }

    // Log closed tabs' info to the console
    console.log("Closed tabs:", closedTabsInfo);

    // Display the result message and set button color
    resultMessage.textContent = message;
    closeTabsButton.style.backgroundColor = buttonColor;
    closeTabsButton.disabled = false; // Re-enable the button
  });

  // Function to update the open tabs counter in real time
  async function updateOpenTabsCounter() {
    const tabs = await browser.tabs.query({});
    openTabsCounter.textContent = tabs.length;
  }

  // Initial update of open tabs counter
  updateOpenTabsCounter();

  // Set up a timer to periodically update the open tabs counter
  setInterval(updateOpenTabsCounter, 100);
});
