document.addEventListener("DOMContentLoaded", async function () {
  const titleInput = document.getElementById("titleInput");
  const closeTabsButton = document.getElementById("closeTabsButton");
  const resultMessage = document.getElementById("resultMessage");
  const openTabsCounter = document.getElementById("openTabsCounter");

  titleInput.focus(); // Automatically focus on the title input field when the extension icon is clicked

  // Adjust textarea height to match content, but no larger than a single line
  const defaultSingleLineHeight = getComputedStyle(titleInput).height;

  titleInput.addEventListener("input", function () {
    if (this.value.trim() === "") {
      this.style.height = defaultSingleLineHeight; // Reset back to default single line height the textarea when content is deleted
    } else {
      this.style.height = defaultSingleLineHeight; // Set a fixed height for a single line
      this.style.height = (this.scrollHeight > parseFloat(getComputedStyle(this).fontSize) * 2.5 ? this.scrollHeight : parseFloat(getComputedStyle(this).fontSize) * 2.5) + "px";
    }
});

  // Add a keydown event listener to the titleInput and programmatically trigger a click on the closeTabsButton
  titleInput.addEventListener("keydown", async function (event) {
    if (event.key === "Enter") {
      await handleAsyncAction();
    }
  });

  // Add a click event listener to the titleInput
  closeTabsButton.addEventListener("click", async () => {
    await handleAsyncAction();
  });

  async function handleAsyncAction() {
    const inputText = titleInput.value.trim(); // Remove leading and trailing whitespace

    if (inputText === "") {
      resultMessage.textContent = "Please enter a title regular expression and try again.";
      resultMessage.style.color = "red";
      closeTabsButton.style.backgroundColor = "red";
      return;
    }

    closeTabsButton.disabled = true;
    closeTabsButton.style.backgroundColor = "blue";
    resultMessage.textContent = "Loading...";
    resultMessage.style.color = "white";

    let regex; // Declare the regex variable outside the try block

    // Catch invalid regular expression errors
    try {
      regex = new RegExp(inputText, "i"); // Case-insensitive regex
    } catch (error) {
        if (error instanceof SyntaxError) {
          resultMessage.textContent = "Please enter a valid regular expression and try again.";
          resultMessage.style.color = "red";
          closeTabsButton.style.backgroundColor = "red";
          closeTabsButton.disabled = false;
          return;
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
      closeTabsButton.disabled = false;
      return;
    }

    // Prompt the user in case he was going to close all opened tabs
    if (totalTabsCount === totalTabsToClose) {
      if (!confirm("You are about to close all open tabs, which will result in exiting your browser.\n\nAre you sure you want to proceed?")) {
        closeTabsButton.disabled = false;
        resultMessage.textContent = "";
        return;
      }
    }

    resultMessage.textContent = `Closing ${tabsClosedCount} of ${totalTabsToClose} tabs...`; // Update result message to show the total count of tabs to close

    for (const tab of tabsToClose) {
      const tabs = await browser.tabs.query({}); // Query the updated list of tabs
      if (tabs.length === 1) {
        await browser.tabs.create({}); // Create a new tab if the user closes all tabs to prevent the web browser from exiting
      }
      await browser.tabs.remove(tab.id); // Remove the opened tab matching the titles regular expression
      tabsClosedCount++;

      closedTabsInfo.push({ url: tab.url, title: tab.title }); // Store closed tabs' info

      resultMessage.textContent = `Closing ${tabsClosedCount} of ${totalTabsToClose} tabs...`; // Display progress in the loading message
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
      resultMessage.style.color = "red";
      buttonColor = "red";
    } else {
      message = "No tabs with matching title found.";
      resultMessage.style.color = "red";
      buttonColor = "red";
    }

    console.log("Closed tabs:", closedTabsInfo); // Log closed tabs' info to the console

    // Display the result message and set button color
    resultMessage.textContent = message;
    closeTabsButton.style.backgroundColor = buttonColor;
    closeTabsButton.disabled = false;
  };

  // Function to update the open tabs counter in real time
  async function updateOpenTabsCounter() {
    const async_tabs = await browser.tabs.query({});
    openTabsCounter.textContent = async_tabs.length;
  }

  updateOpenTabsCounter(); // Initial update of open tabs counter

  setInterval(updateOpenTabsCounter, 100); // Set up a timer to periodically update the open tabs counter
});
