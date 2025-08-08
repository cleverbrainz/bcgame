// Content script for additional functionality
// This script runs on all pages and can be used for automatic detection

// Function to highlight target elements (optional feature)
function highlightTargetElements() {
  const targetElements = document.querySelectorAll('[class*="h-[27.3rem]"]');

  if (targetElements.length > 0) {
    targetElements.forEach((element) => {
      element.style.border = "3px solid #007bff";
      element.style.boxShadow = "0 0 15px rgba(0, 123, 255, 0.5)";
      element.style.borderRadius = "8px";
    });

    // Remove highlight after 4 seconds
    setTimeout(() => {
      targetElements.forEach((element) => {
        element.style.border = "";
        element.style.boxShadow = "";
        element.style.borderRadius = "";
      });
    }, 4000);

    return targetElements.length;
  }

  return 0;
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "highlight") {
    const count = highlightTargetElements();
    sendResponse({ success: true, count: count });
  }
});

// Optional: Auto-detect elements when page loads
document.addEventListener("DOMContentLoaded", function () {
  const targetElements = document.querySelectorAll('[class*="h-[27.3rem]"]');
  if (targetElements.length > 0) {
    console.log(
      `Element Value Summer: Found ${targetElements.length} target element(s) on this page`
    );
  }
});
