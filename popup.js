document.addEventListener("DOMContentLoaded", function () {
  const readButton = document.getElementById("readValues");
  const leftNormalValues = document.getElementById("leftNormalValues");
  const leftNormalSum = document.getElementById("leftNormalSum");
  const leftCrashValues = document.getElementById("leftCrashValues");
  const leftCrashSum = document.getElementById("leftCrashSum");
  const rightNormalValues = document.getElementById("rightNormalValues");
  const rightNormalSum = document.getElementById("rightNormalSum");
  const rightMoonValues = document.getElementById("rightMoonValues");
  const rightMoonSum = document.getElementById("rightMoonSum");
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

        // Display left column normal values
        if (data.leftColumn.normalValues.length > 0) {
          leftNormalValues.textContent = data.leftColumn.normalValues
            .map((v) => `$${v.toFixed(2)}`)
            .join(", ");
          leftNormalSum.textContent = `$${data.leftColumn.normalSum.toFixed(
            2
          )}`;
        } else {
          leftNormalValues.textContent = "No normal values found";
          leftNormalSum.textContent = "$0.00";
        }

        // Display left column crash values
        if (data.leftColumn.crashValues.length > 0) {
          leftCrashValues.textContent = data.leftColumn.crashValues
            .map((v) => `$${v.toFixed(2)}`)
            .join(", ");
          leftCrashSum.textContent = `$${data.leftColumn.crashSum.toFixed(2)}`;
        } else {
          leftCrashValues.textContent = "No crash values found";
          leftCrashSum.textContent = "$0.00";
        }

        // Display right column normal values
        if (data.rightColumn.normalValues.length > 0) {
          rightNormalValues.textContent = data.rightColumn.normalValues
            .map((v) => `$${v.toFixed(2)}`)
            .join(", ");
          rightNormalSum.textContent = `$${data.rightColumn.normalSum.toFixed(
            2
          )}`;
        } else {
          rightNormalValues.textContent = "No normal values found";
          rightNormalSum.textContent = "$0.00";
        }

        // Display right column moon values
        if (data.rightColumn.moonValues.length > 0) {
          rightMoonValues.textContent = data.rightColumn.moonValues
            .map((v) => `$${v.toFixed(2)}`)
            .join(", ");
          rightMoonSum.textContent = `$${data.rightColumn.moonSum.toFixed(2)}`;
        } else {
          rightMoonValues.textContent = "No moon values found";
          rightMoonSum.textContent = "$0.00";
        }

        // Show success message and stats
        messageDiv.innerHTML = `<div class="success">✅ Successfully read ${data.elementsFound} element(s)</div>`;
        statsDiv.textContent = `Left: ${data.leftColumn.normalValues.length} normal + ${data.leftColumn.crashValues.length} crash | Right: ${data.rightColumn.normalValues.length} normal + ${data.rightColumn.moonValues.length} moon`;
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

    let leftColumn = {
      normalValues: [],
      crashValues: [],
      normalSum: 0,
      crashSum: 0,
    };
    let rightColumn = {
      normalValues: [],
      moonValues: [],
      normalSum: 0,
      moonSum: 0,
    };

    // Process each target element
    for (const element of targetElements) {
      // Find the two main divs (left and right columns)
      const mainDivs = element.querySelectorAll("div.w-1\\/2");

      if (mainDivs.length >= 2) {
        // Process left column (first div)
        const leftColumnData = extractValuesFromColumn(mainDivs[0]);
        leftColumn.normalValues.push(...leftColumnData.normalValues);
        leftColumn.crashValues.push(...leftColumnData.crashValues);

        // Process right column (second div)
        const rightColumnData = extractValuesFromColumn(mainDivs[1]);
        rightColumn.normalValues.push(...rightColumnData.normalValues);
        rightColumn.moonValues.push(...rightColumnData.moonValues);
      }
    }

    // Calculate sums
    leftColumn.normalSum = leftColumn.normalValues.reduce(
      (sum, num) => sum + num,
      0
    );
    leftColumn.crashSum = leftColumn.crashValues.reduce(
      (sum, num) => sum + num,
      0
    );
    rightColumn.normalSum = rightColumn.normalValues.reduce(
      (sum, num) => sum + num,
      0
    );
    rightColumn.moonSum = rightColumn.moonValues.reduce(
      (sum, num) => sum + num,
      0
    );

    return {
      leftColumn: leftColumn,
      rightColumn: rightColumn,
      elementsFound: targetElements.length,
    };
  } catch (error) {
    return { error: "Error reading elements: " + error.message };
  }
}
