export { delay };

/**
 * This function creates a pause in code execution for a specified number of milliseconds.
 * @param {number} milliseconds
 */
function delay(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}
