import { retrieveSettings } from "/js/retrieveSettings.js";
import { saveSettings } from "/js/saveSettings.js";
import { handleSettingChange } from "/js/handleSettingChange.js";

document.addEventListener("DOMContentLoaded", async function () {
  const settingsButton = document.getElementById("settingsButton");
  const titleInput = document.getElementById("titleInput");
  const closeTabsButton = document.getElementById("closeTabsButton");
  const switchButton = document.getElementById("switchButton");
  const openTabsCounter = document.getElementById("openTabsCounter");
  const tabsLoadingText = document.getElementById("tabsLoadingText");
  const resultMessage = document.getElementById("resultMessage");
  const errorsStream = document.getElementById("errorsStream");

  const defaultSingleLineHeight = getComputedStyle(titleInput).height;
  const defaultcloseTabsButtonBackgroundColor = window.getComputedStyle(closeTabsButton).backgroundColor;

  updateUI({ init: "popup" });

  // Add a click event listener to the settings button
  settingsButton.addEventListener("click", function () {
    browser.tabs.create({ url: "/settings/settings.html", active: true });
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
  titleInput.addEventListener("paste", async function (event) {
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

  closeTabsButton.addEventListener("click", async () => {
    await closeOpenTabs();
  });

  switchButton.addEventListener("click", async () => {
    await handleSwitchButton();
  });

  browser.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local") {
      return;
    }

    handleSettingChange(changes, areaName, {
      preserveTabsByTitle: switchButton,
    });

    if (changes.hasOwnProperty("preserveTabsByTitle")) {
      const newValue = changes["preserveTabsByTitle"].newValue;
      updateUI({ switchButton: newValue });
    }
  });

  async function closeOpenTabs() {
    updateUI({ loading: true });

    const settings = await retrieveSettings(["preserveTabsByTitle", "insensitiveSearch", "whitelistFirefoxReservedTabs"]);

    const inputText = titleInput.value.trim(); // Remove leading and trailing whitespace

    if (inputText === "") {
      await delay(200); // Adds a short delay to ensure that the "Loading..." text remains readable, even while spamming the "Close Tabs" button
      updateUI({ error: "Please enter a title regular expression and try again." });
      return;
    }

    let regexFlags; // Declare the 'regexFlags' variable outside the if statement
    if (settings.insensitiveSearch) {
      regexFlags = "i";
    } else {
      regexFlags = undefined;
    }

    let regex;
    try {
      regex = new RegExp(inputText, regexFlags);
    } catch (error) {
      if (error instanceof SyntaxError) {
        await delay(200);
        updateUI({ error: "Please enter a valid regular expression and try again." });
        return;
      }
    }

    // Calculate the total count of tabs to close
    let tabs, filteredTabs, userInputTabs, tabsToClose;

    tabs = await browser.tabs.query({});

    if (settings.whitelistFirefoxReservedTabs) {
      filteredTabs = filterFirefoxReservedTabs(tabs);
    } else {
      filteredTabs = tabs;
    }

    userInputTabs = await findTabsByTitleRegex(filteredTabs, regex);

    ({ tabsToClose } = getTabsToPreserveAndClose(settings, userInputTabs, filteredTabs));

    const totalTabsCount = tabs.length;
    const totalTabsToClose = tabsToClose.length;

    // Check if there are tabs to close matching the regular expression
    if (totalTabsToClose <= 0) {
      await delay(200);
      updateUI({ error: "No open tabs matching this regular expression found." });
      return;
    }

    // Prompt the user in case he was going to close all opened tabs
    if (totalTabsCount === totalTabsToClose) {
      await delay(200);
      if (!confirm("You are about to close all open tabs, which will result in exiting your browser.\n\nAre you sure you want to proceed?")) {
        updateUI({ init: true });
        return;
      }
    }

    // Send a message to the extension's background script to initiate the closing of tabs
    await browser.runtime.sendMessage({
      action: "closeTabs",
      tabsToClose,
    });

    tabs = await browser.tabs.query({});

    // Create an array of information about the closed tabs, and output the information about the closed tabs to the console
    const closedTabs = findClosedTabs(tabsToClose, tabs);
    const closedTabsInfo = closedTabs.map((tab) => ({ title: tab.title, url: tab.url }));
    const tabsClosedCount = closedTabs.length;
    console.log("Closed tabs:", closedTabsInfo);

    if (tabsClosedCount > 0) {
      updateUI({ success: `${tabsClosedCount} ${tabsClosedCount === 1 ? "tab" : "tabs"} with a matching title have been closed out of ${totalTabsCount} ${totalTabsCount === 1 ? "tab" : "tabs"}.` });
    } else if (tabsClosedCount === 0) {
      await delay(200);
      updateUI({ error: "No open tabs to close." });
    } else {
      await delay(200);
      updateUI({ error: "No tabs with matching title found." });
    }

    return;
  }

  async function handleSwitchButton() {
    await saveSettings({ preserveTabsByTitle: switchButton.checked });
    closeTabsButton.style.backgroundColor = defaultcloseTabsButtonBackgroundColor;
    resultMessage.textContent = "";
  }

  /**
   * This function filters an array of tabs to find those that are currently loading.
   * @param {Array} tabs
   */
  function findTabsLoading(tabs) {
    return tabs.filter((tab) => tab.status === "loading");
  }

  /**
   * This function filters two arrays of tabs to find those that has been closed.
   * @param {Array} tabsToClose
   * @param {Array} tabs
   */
  function findClosedTabs(tabsToClose, tabs) {
    return tabsToClose.filter((tabToClose) => !tabs.some((tab) => tab.id === tabToClose.id));
  }

  /**
   * @param {Array} urls
   */
  function filterFirefoxReservedTabs(tabs) {
    const reservedPrefixesRegex = new RegExp(/^(about|chrome|resource|moz-extension|data|view-source):/i);
    return tabs.filter((object) => !reservedPrefixesRegex.test(object.url));
  }

  /**
   * This function creates a pause in code execution for a specified number of milliseconds.
   * @param {number} milliseconds
   */
  function delay(milliseconds) {
    return new Promise((resolve) => {
      setTimeout(resolve, milliseconds);
    });
  }

  /**
   * This asynchronous function filters an array of tabs using a regular expression pattern on their titles.
   * @param {object} settings
   * @param {Array} tabs
   * @param {RegExp} regex
   */
  async function findTabsByTitleRegex(tabs, regex) {
    let prefix;

    const filteredTabs = tabs.filter((tab) => {
      try {
        return regex.test(tab.title);
      } catch (error) {
        if (errorsStream.textContent !== undefined) {
          prefix = "\n";
        }
        updateUI({ errorsStream: `${prefix}User-regex filtering error on tab's title: "${tab.title}"\n${error}` });
      }
    });

    console.log(filteredTabs);
    return filteredTabs;
  }

  /**
   * This function determines which tabs to preserve and which tabs to close
   * based on the provided settings, user-defined tabs, and filtered tabs.
   * @param {object} settings
   * @param {Array} userInputTabs
   * @param {Array} filteredTabs
   */
  function getTabsToPreserveAndClose(settings, userInputTabs, filteredTabs) {
    let tabsToPreserve, tabsToClose;

    if (settings.preserveTabsByTitle) {
      tabsToPreserve = userInputTabs;
      tabsToClose = filteredTabs.filter((tab) => !tabsToPreserve.includes(tab));
    } else {
      tabsToClose = userInputTabs;
      tabsToPreserve = filteredTabs.filter((tab) => !tabsToClose.includes(tab));
    }

    return { tabsToPreserve, tabsToClose };
  }

  /**
   * Update the UI based on the given options
   * @param {object} options
   */
  async function updateUI(options) {
    if (options.loading) {
      closeTabsButton.disabled = true;
      switchButton.disabled = true;
      resultMessage.textContent = "Loading...";
      resultMessage.style.color = "white";
      closeTabsButton.style.backgroundColor = defaultcloseTabsButtonBackgroundColor;
      return;
    } else if (options.error) {
      resultMessage.textContent = options.error;
      resultMessage.style.color = "red";
      closeTabsButton.style.backgroundColor = "red";
      closeTabsButton.disabled = false;
      switchButton.disabled = false;
    } else if (options.success) {
      resultMessage.textContent = options.success;
      resultMessage.style.color = "white";
      closeTabsButton.style.backgroundColor = "green";
      closeTabsButton.disabled = false;
      switchButton.disabled = false;
    } else if (options.errorsStream) {
      errorsStream.textContent += options.errorsStream;
      return;
    } else {
      let preserveTabsByTitle;

      if (options.init) {
        if (options.init === "popup") {
          preserveTabsByTitle = (await retrieveSettings("preserveTabsByTitle")).preserveTabsByTitle;
          switchButton.checked = preserveTabsByTitle;
        }

        resultMessage.textContent = "";
        resultMessage.style.color = "white";
        closeTabsButton.style.backgroundColor = defaultcloseTabsButtonBackgroundColor;
        closeTabsButton.disabled = false;
        switchButton.disabled = false;
      }

      if (options.hasOwnProperty("switchButton")) {
        preserveTabsByTitle = options.switchButton;
        resultMessage.textContent = "";
        resultMessage.style.color = "white";
        closeTabsButton.style.backgroundColor = defaultcloseTabsButtonBackgroundColor;
      }

      if (typeof preserveTabsByTitle !== "undefined") {
        closeTabsButton.textContent = preserveTabsByTitle ? "Preserve Tabs" : "Close Tabs";
      }
    }

    titleInput.focus();
  }

  /**
   * Function to update the "open tabs counter" and "tabs loading text" in real time
   */
  async function updateOpenTabsCounter() {
    const tabs = await browser.tabs.query({});
    const tabsCounter = tabs.length;

    openTabsCounter.textContent = tabsCounter;
    updateTabsLoadingText();

    function updateTabsLoadingText() {
      const tabsStillLoading = findTabsLoading(tabs);
      const tabsStillLoadingCounter = tabsStillLoading.length;

      if (tabsStillLoadingCounter > 0) {
        tabsLoadingText.textContent = ` (${tabsStillLoadingCounter} ${tabsStillLoadingCounter === 1 ? "tab is" : "tabs are"} loading)`;
      } else {
        tabsLoadingText.textContent = "";
      }
    }
  }

  setInterval(updateOpenTabsCounter, 100); // Set up a timer to periodically update the open tabs counter
});
