document.addEventListener("DOMContentLoaded", function () {
  const readButton = document.getElementById("readValues");
  const firstDivValues = document.getElementById("firstDivValues");
  const firstDivSum = document.getElementById("firstDivSum");
  const secondDivValues = document.getElementById("secondDivValues");
  const secondDivSum = document.getElementById("secondDivSum");
  const messageDiv = document.getElementById("message");
  const statsDiv = document.getElementById("stats");

  readButton.addEventListener("click", async function () {
    try {
      messageDiv.innerHTML = "";
      readButton.disabled = true;
      readButton.textContent = "🔄 Reading...";

      // Get the active tab
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      // Execute the content script to read values
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: readElementValues,
      });

      if (results && results[0] && results[0].result) {
        const data = results[0].result;

        if (data.error) {
          messageDiv.innerHTML = `<div class="error">❌ ${data.error}</div>`;
          return;
        }

        // Display first div data
        if (data.firstDiv.values.length > 0) {
          firstDivValues.textContent = data.firstDiv.values
            .map((v) => `$${v.toFixed(2)}`)
            .join(", ");

          let leftSumText = `$${data.firstDiv.sum.toFixed(2)}`;
          if (data.firstDiv.crashSubtracted > 0) {
            leftSumText += ` (crash subtracted: $${data.firstDiv.crashSubtracted.toFixed(
              2
            )})`;
          }
          firstDivSum.textContent = leftSumText;
        } else {
          firstDivValues.textContent = "No values found";
          firstDivSum.textContent = "$0.00";
        }

        // Display second div data
        if (data.secondDiv.values.length > 0) {
          secondDivValues.textContent = data.secondDiv.values
            .map((v) => `$${v.toFixed(2)}`)
            .join(", ");

          let rightSumText = `$${data.secondDiv.sum.toFixed(2)}`;
          if (data.secondDiv.moonSubtracted > 0) {
            rightSumText += ` (moon subtracted: $${data.secondDiv.moonSubtracted.toFixed(
              2
            )})`;
          }
          secondDivSum.textContent = rightSumText;
        } else {
          secondDivValues.textContent = "No values found";
          secondDivSum.textContent = "$0.00";
        }

        // Show success message and stats
        messageDiv.innerHTML = `<div class="success">✅ Successfully read ${data.elementsFound} element(s)</div>`;
        statsDiv.textContent = `Found ${data.firstDiv.values.length} normal values in left column, ${data.secondDiv.values.length} normal values in right column`;
      } else {
        messageDiv.innerHTML =
          '<div class="error">❌ Failed to read values from page</div>';
      }
    } catch (error) {
      messageDiv.innerHTML = `<div class="error">❌ Error: ${error.message}</div>`;
    } finally {
      readButton.disabled = false;
      readButton.textContent = "🔍 Read Values";
    }
  });
});

// Function to be injected into the page
function readElementValues() {
  // Helper function to extract dollar values from a column
  function extractValuesFromColumn(columnDiv) {
    const normalValues = [];
    const crashValues = [];
    const moonValues = [];

    // Find all row containers within the column
    const rows = columnDiv.querySelectorAll("div.flex.items-center.h-10");

    for (const row of rows) {
      // Find spans that contain dollar amounts in this row
      const dollarSpans = row.querySelectorAll("span");

      for (const span of dollarSpans) {
        const text = span.textContent || span.innerText || "";

        // Look for dollar amounts (e.g., $123.45, $1,234.56)
        const dollarMatches = text.match(/\$[\d,]+\.?\d*/g);

        if (dollarMatches) {
          for (const match of dollarMatches) {
            // Remove $ and commas, then parse as float
            const cleanValue = match.replace(/[$,]/g, "");
            const num = parseFloat(cleanValue);

            if (!isNaN(num) && num > 0) {
              // Categorize based on the row's class
              if (row.querySelector(".crash-bg-btn")) {
                crashValues.push(num);
              } else if (row.querySelector(".moon-bg-btn")) {
                moonValues.push(num);
              } else {
                normalValues.push(num);
              }
            }
          }
        }
      }
    }

    return { normalValues, crashValues, moonValues };
  }

  try {
    // Look for elements with h-[27.3rem] class
    const targetElements = document.querySelectorAll('[class*="h-[27.3rem]"]');

    if (targetElements.length === 0) {
      return { error: "No elements with h-[27.3rem] class found on this page" };
    }

    let firstDiv = { values: [], sum: 0, crashSubtracted: 0 };
    let secondDiv = { values: [], sum: 0, moonSubtracted: 0 };

    // Process each target element
    for (const element of targetElements) {
      // Find the two main divs (left and right columns)
      const mainDivs = element.querySelectorAll("div.w-1\\/2");

      if (mainDivs.length >= 2) {
        // Process first div (left column)
        const firstColumnData = extractValuesFromColumn(mainDivs[0]);
        firstDiv.values.push(...firstColumnData.normalValues);

        // Calculate crash values to subtract from left column
        const crashSum = firstColumnData.crashValues.reduce(
          (sum, num) => sum + num,
          0
        );
        firstDiv.crashSubtracted += crashSum;

        // Process second div (right column)
        const secondColumnData = extractValuesFromColumn(mainDivs[1]);
        secondDiv.values.push(...secondColumnData.normalValues);

        // Calculate moon values to subtract from right column
        const moonSum = secondColumnData.moonValues.reduce(
          (sum, num) => sum + num,
          0
        );
        secondDiv.moonSubtracted += moonSum;
      }
    }

    // Calculate sums: normal values minus special values
    const firstDivNormalSum = firstDiv.values.reduce(
      (sum, num) => sum + num,
      0
    );
    const secondDivNormalSum = secondDiv.values.reduce(
      (sum, num) => sum + num,
      0
    );

    firstDiv.sum = firstDivNormalSum - firstDiv.crashSubtracted;
    secondDiv.sum = secondDivNormalSum - secondDiv.moonSubtracted;

    return {
      firstDiv: firstDiv,
      secondDiv: secondDiv,
      elementsFound: targetElements.length,
    };
  } catch (error) {
    return { error: "Error reading elements: " + error.message };
  }
}
