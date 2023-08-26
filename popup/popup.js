document.addEventListener("DOMContentLoaded", async function () {
  const titleInput = document.getElementById("titleInput");
  const closeTabsButton = document.getElementById("closeTabsButton");
  const resultMessage = document.getElementById("resultMessage");
  const openTabsCounter = document.getElementById("openTabsCounter");

  const defaultSingleLineHeight = getComputedStyle(titleInput).height;
  const defaultcloseTabsButtonBackgroundColor = window.getComputedStyle(closeTabsButton).backgroundColor;

  titleInput.focus(); // Automatically focus on the title input field when the extension icon is clicked

  // Adjust title ipnut text area height to match content, but no larger than a single line
  titleInput.addEventListener("input", function () {
    if (this.value.trim() === "") {
      this.style.height = defaultSingleLineHeight; // Reset back to default single line height the textarea when content is deleted
    } else {
      this.style.height = defaultSingleLineHeight; // Set a fixed height for a single line
      this.style.height = (this.scrollHeight > parseFloat(getComputedStyle(this).fontSize) * 2.5 ? this.scrollHeight : parseFloat(getComputedStyle(this).fontSize) * 2.5) + "px"; // Don't ask me.
    }
  });

  // Replacing pasted text's new lines to literal "\n" in the regular expression, because tab titles cannot contain a new line character.
  titleInput.addEventListener("paste", async function(event) {
    if (document.activeElement === titleInput) {
      event.preventDefault(); // Prevent the default paste behavior

      const clipboardText = event.clipboardData.getData("text");
      const processedText = clipboardText.replace(/\n/g, "\\n");

      titleInput.textContent = "";
      document.execCommand("insertText", false, processedText); // Insert the processed text at the current cursor position, KEEPING THE SCROLLBAR FEATURE AS WELL. !! 'execCommand' FEATURE DEPRACTED: https://developer.mozilla.org/en-US/docs/Web/API/Document/execCommand !!
    }
  });

  // Add a keydown event listener to the titleInput and take the 'Close Tabs' button action
  titleInput.addEventListener("keydown", async function (event) {
    if (event.key === "Enter" && document.activeElement === titleInput) {
      event.preventDefault(); // Prevent the Enter key from creating a new line within the title input area

      await closeOpenTabs();
    }
  });

  // Add a click event listener to the titleInput
  closeTabsButton.addEventListener("click", async () => {
    await closeOpenTabs();
  });

  async function closeOpenTabs() {
    closeTabsButton.disabled = true;
    closeTabsButton.style.backgroundColor = "blue";
    resultMessage.textContent = "Loading...";
    resultMessage.style.color = "white";

    const inputText = titleInput.value.trim(); // Remove leading and trailing whitespace

    if (inputText === "") {
      await delay(0);
      resultMessage.textContent = "Please enter a title regular expression and try again.";
      resultMessage.style.color = "red";
      closeTabsButton.style.backgroundColor = "red";
      closeTabsButton.disabled = false;
      titleInput.focus()
      return;
    }

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
          titleInput.focus()
          return;
        }
    }

    // Calculate the total count of tabs to close
    const tabs = await browser.tabs.query({}); // Query the updated list of tabs every time the button is clicked
    const totalTabsCount = tabs.length; // Count of tabs that match the search criteria
    const tabsToClose = tabs.filter(tab => regex.test(tab.title));
    const totalTabsToClose = tabsToClose.length;

    // Check if there are tabs to close matching the regular expression
    if (totalTabsToClose <= 0) {
      resultMessage.textContent = "No open tabs matching this regular expression found.";
      resultMessage.style.color = "red";
      closeTabsButton.style.backgroundColor = "red";
      closeTabsButton.disabled = false;
      titleInput.focus()
      return;
    }

    // Prompt the user in case he was going to close all opened tabs
    if (totalTabsCount === totalTabsToClose) {
      if (!confirm("You are about to close all open tabs, which will result in opening your default new tab page.\n\nAre you sure you want to proceed?")) {
        resultMessage.textContent = "";
        closeTabsButton.style.backgroundColor = defaultcloseTabsButtonBackgroundColor;
        closeTabsButton.disabled = false;
        titleInput.focus()
        return;
      }
    }

    let tabsClosedCount = 0; // Initialize a counter to keep track of the number of tabs that have been closed
    let closedTabsInfo = []; // Array to store closed tabs' info
    let message = "";
    let buttonColor = "";

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
    titleInput.focus() // TODO: NOT WORKING FOR SOME REASONS?
  };

  async function delay(milliseconds) {
    return new Promise(resolve => {
      setTimeout(resolve, milliseconds);
    });
  }

  // Function to update the open tabs counter in real time
  async function updateOpenTabsCounter() {
    const async_tabs = await browser.tabs.query({});
    openTabsCounter.textContent = async_tabs.length;
  }

  updateOpenTabsCounter(); // Initial update of open tabs counter

  setInterval(updateOpenTabsCounter, 100); // Set up a timer to periodically update the open tabs counter
});
