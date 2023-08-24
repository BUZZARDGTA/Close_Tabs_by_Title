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

    closeTabsButton.disabled = true; // Disable the button while processing
    closeTabsButton.style.backgroundColor = "blue"; // Set button color to blue
    resultMessage.textContent = "Loading..."; // Show loading message
    resultMessage.style.color = "white"; // Reset text color to white

    let regex; // Declare the regex variable outside the try block

    try {
      regex = new RegExp(inputText, "i"); // Case-insensitive regex
    } catch (error) { // Catch invalid regular expression errors
        if (error instanceof SyntaxError) {
          resultMessage.textContent = "Please enter a valid regular expression and try again.";
          resultMessage.style.color = "red"; // Set text color to red
          closeTabsButton.style.backgroundColor = "red"; // Set button color to red
          closeTabsButton.disabled = false; // Enable the button back
          return; // Exit the function if regular expression is invalid
        }
    }

    let tabsClosedCount = 0; // Initialize a counter to keep track of the number of tabs that have been closed
    let closedTabsInfo = []; // Array to store closed tabs' info

    const tabs = await browser.tabs.query({}); // Query the updated list of tabs every time the button is clicked
    const totalTabsCount = tabs.length; // Count of tabs that match the search criteria

    // Calculate the total count of tabs to close
    const tabsToClose = tabs.filter(tab => regex.test(tab.title));
    const totalTabsToClose = tabsToClose.length;

    // Check if there are tabs to close matching the regular expression
    if (totalTabsToClose <= 0) {
      resultMessage.textContent = "No open tabs matching this regular expression found.";
      resultMessage.style.color = "red";
      closeTabsButton.style.backgroundColor = "red";
      return;
}

    // Prompt the user in case he was going to close all opened tabs
    if (totalTabsCount === totalTabsToClose) {
      if (!confirm("You are about to close all open tabs, which will result in exiting your browser.\n\nAre you sure you want to proceed?")) {
        closeTabsButton.disabled = false; // Enable the button back
        resultMessage.textContent = ""; // Delete the loading message
        return; // Exit the function if user don't want to close all tabs
      }
    }

    // Update result message to show the total count of tabs to close
    resultMessage.textContent = `Closing ${tabsClosedCount} of ${totalTabsToClose} tabs...`;

    for (const tab of tabsToClose) {
      const tabs = await browser.tabs.query({}); // Query the updated list of tabs
      if (tabs.length === 1) {
        await browser.tabs.create({}); // Create a new tab if the user closes all tabs to prevent the web browser from exiting
      }
      await browser.tabs.remove(tab.id); // Remove the opened tab matching the titles regular expression
      tabsClosedCount++;

      // Store closed tabs' info
      closedTabsInfo.push({ url: tab.url, title: tab.title });

      // Display progress in the loading message
      resultMessage.textContent = `Closing ${tabsClosedCount} of ${totalTabsToClose} tabs...`;
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
    const async_tabs = await browser.tabs.query({});
    openTabsCounter.textContent = async_tabs.length;
  }

  // Initial update of open tabs counter
  updateOpenTabsCounter();

  // Set up a timer to periodically update the open tabs counter
  setInterval(updateOpenTabsCounter, 100);
});
