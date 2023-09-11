import {retrieveSettings} from "../shared/shared_functions.js";

document.addEventListener("DOMContentLoaded", async function () {

  const settingsButton = document.getElementById("settingsButton");
  const titleInput = document.getElementById("titleInput");
  const closeTabsButton = document.getElementById("closeTabsButton");
  const openTabsCounter = document.getElementById("openTabsCounter");
  const tabsLoadingText = document.getElementById("tabsLoadingText");
  const resultMessage = document.getElementById("resultMessage");

  const defaultSingleLineHeight = getComputedStyle(titleInput).height;
  const defaultcloseTabsButtonBackgroundColor = window.getComputedStyle(closeTabsButton).backgroundColor;

  titleInput.focus(); // Automatically focus on the title input field when the extension icon is clicked

  // Add a click event listener to the settings button
  settingsButton.addEventListener("click", function () {
    browser.tabs.create({ url:"../settings/settings.html", active: true });
    window.close();
  });

  // Adjust title input text area height to match content, but no larger than a single line
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

    const settings = await retrieveSettings(["sensitiveSearch", "whitelistFirefoxReservedTabs"]);

    const inputText = titleInput.value.trim(); // Remove leading and trailing whitespace

    if (inputText === "") {
      await delay(200); // Adds a short delay to ensure that the "Loading..." text remains readable, even while spamming the "Close Tabs" button
      resultMessage.textContent = "Please enter a title regular expression and try again.";
      resultMessage.style.color = "red";
      closeTabsButton.style.backgroundColor = "red";
      closeTabsButton.disabled = false;
      titleInput.focus();
      return;
    }

    let regexFlags; // Declare the 'regexFlags' variable outside the if statement
    if (settings.sensitiveSearch === true) {
      regexFlags = "i";
    } else {
      regexFlags = undefined;
    }

    let _regex;  // Declare the '_regex' variable outside the the try block
    // Catch invalid regular expression errors
    try {
      _regex = new RegExp(inputText, regexFlags);
    } catch (error) {
      if (error instanceof SyntaxError) {
        await delay(200);
        resultMessage.textContent = "Please enter a valid regular expression and try again.";
        resultMessage.style.color = "red";
        closeTabsButton.style.backgroundColor = "red";
        closeTabsButton.disabled = false;
        titleInput.focus();
        return;
      }
    }
    const regex = _regex;

    // Calculate the total count of tabs to close
    const tabs = await browser.tabs.query({});
    const tabsToClose = await findTabsByTitleRegex(settings, tabs, regex);
    const totalTabsCount = Number(tabs.length);
    const totalTabsToClose = Number(tabsToClose.length);

    // Check if there are tabs to close matching the regular expression
    if (totalTabsToClose <= 0) {
      await delay(200);
      resultMessage.textContent = "No open tabs matching this regular expression found.";
      resultMessage.style.color = "red";
      closeTabsButton.style.backgroundColor = "red";
      closeTabsButton.disabled = false;
      titleInput.focus();
      return;
    }

    // Prompt the user in case he was going to close all opened tabs
    if (totalTabsCount === totalTabsToClose) {
      await delay(200);
      if (!confirm("You are about to close all open tabs, which will result in exiting your browser.\n\nAre you sure you want to proceed?")) {
        resultMessage.textContent = "";
        closeTabsButton.style.backgroundColor = defaultcloseTabsButtonBackgroundColor;
        closeTabsButton.disabled = false;
        titleInput.focus();
        return;
      }
    }

    // Send a message to the extension's background script to initiate the closing of tabs
    await browser.runtime.sendMessage({
      action: "closeTabs",
      tabsToClose
    });

    const remainingTabsToClose = await findTabsByTitleRegex(settings, undefined, regex);
    const remainingTotalTabsToClose = Number(remainingTabsToClose.length);
    const tabsClosedCount = (totalTabsToClose - remainingTotalTabsToClose);

    // Create an array of information about the closed tabs, and output the information about the closed tabs to the console
    const closedTabs = findClosedTabs(tabsToClose, remainingTabsToClose);
    const closedTabsInfo = closedTabs.map((tab) => ({ title: tab.title, url: tab.url }));
    console.log("Closed tabs:", closedTabsInfo);

    let message = "";
    let buttonColor = "";

    if (tabsClosedCount > 0) {
      message = `${tabsClosedCount} ${tabsClosedCount === 1 ? "tab" : "tabs"} with a matching title have been closed out of ${totalTabsCount} ${totalTabsCount === 1 ? "tab" : "tabs"}.`;
      buttonColor = "green";
    } else if (tabsClosedCount === 0) {
      message = "No open tabs to close.";
      resultMessage.style.color = "red";
      buttonColor = "red";
    } else {
      message = "No tabs with matching title found.";
      resultMessage.style.color = "red";
      buttonColor = "red";
    }

    // Display the result message and set button color
    resultMessage.textContent = message;
    closeTabsButton.style.backgroundColor = buttonColor;
    closeTabsButton.disabled = false;
    titleInput.focus(); // TODO: THIS WILL NOT BE WORKING IF THE CURRENT TAB THAT OPENED THE POPUP OF THE EXTENSION GOT CLOSED, that probably means that the "popup.html" then lost it's focus.
  }

  // This function filters an array of tabs to find those that are currently loading.
  function findTabsLoading(tabs) {
    return tabs.filter(tab => tab.status === "loading");
  }

  // This function filters an array of tabs to find those that are marked for closure
  // but are not present in the array of tabs that are intended to remain open.
  function findClosedTabs(tabsToClose, remainingTabsToClose) {
    return tabsToClose.filter((tabToClose) =>
      !remainingTabsToClose.some((remainingTabToClose) => remainingTabToClose.id === tabToClose.id)
    );
  }

  // This function creates a pause in code execution for a specified number of milliseconds.
  function delay(milliseconds) {
    return new Promise(resolve => {
      setTimeout(resolve, milliseconds);
    });
  }

  // This asynchronous function filters an array of tabs using a regular expression pattern on their titles.
  async function findTabsByTitleRegex(settings, tabs, regex) {
    if (!tabs) {
      tabs = await browser.tabs.query({});
    }

    if (settings.whitelistFirefoxReservedTabs === true) {
      tabs = await filterFirefoxReservedTabs(tabs);
    }

    return tabs.filter(tab => regex.test(tab.title));
  }

  // Function to filter out URLs starting with the specified prefixes
  async function filterFirefoxReservedTabs(urls) {
    const reservedPrefixesRegex = new RegExp(/^(about:|chrome:|resource:|moz-extension:|data:)/, "i");
    return await urls.filter(object => !reservedPrefixesRegex.test(object.url));
  }

  // Function to update the "open tabs counter" and "tabs loading text" in real time
  async function updateOpenTabsCounter() {
    const tabs = await browser.tabs.query({});
    const tabsCounter = Number(tabs.length);

    openTabsCounter.textContent = tabsCounter
    await updateTabsLoadingText();

    async function updateTabsLoadingText() {
      const tabsStillLoading = findTabsLoading(tabs);
      const tabsStillLoadingCounter = Number(tabsStillLoading.length);

      if (tabsStillLoadingCounter > 0) {
        tabsLoadingText.textContent = ` (${tabsStillLoadingCounter} ${tabsStillLoadingCounter === 1 ? "tab is" : "tabs are"} loading)`;
      } else {
        tabsLoadingText.textContent = "";
      }
    }
  }

  updateOpenTabsCounter(); // Initial update of open tabs counter

  setInterval(updateOpenTabsCounter, 100); // Set up a timer to periodically update the open tabs counter

});
