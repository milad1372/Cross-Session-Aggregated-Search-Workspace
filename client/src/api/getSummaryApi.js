// getSummaryApi.js

const AWS_Base_URL = "http://ec2-3-143-18-63.us-east-2.compute.amazonaws.com:3005/";
const Local_Base_URL = "http://localhost:3001/";
const mainURL =
  window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? Local_Base_URL
    : AWS_Base_URL;

const getSummary = async function (highlightedKeys, europeanaText, wikipediaText, libraryText, selectedPassage,sourceMapping) {
  const headers = new Headers();
  headers.append("Content-Type", "application/json");
  headers.append("Accept", "application/json");
  headers.append("Access-Control-Allow-Origin", "*");

  const requestOptions = {
    method: "POST",
    headers: headers,
    body: JSON.stringify({
      highlightedKeys,
      europeanaText,
      wikipediaText,
      libraryText,
      selectedPassage,
      sourceMapping,  // <-- ensure we send it
    })
  };

  const response = await fetch(mainURL + "summarize", requestOptions);
  if (!response.ok) {
    console.error("Error in summarization response", response.statusText);
    return null;
  }
  const result = await response.json();
  return result;
};

export default getSummary;
