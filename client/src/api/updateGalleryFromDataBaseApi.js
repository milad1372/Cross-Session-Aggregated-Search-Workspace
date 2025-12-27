// updateGalleryFromDataBaseApi.js
const AWS_Base_URL = "http://ec2-3-143-18-63.us-east-2.compute.amazonaws.com:3005/";
const Local_Base_URL = "http://localhost:3001/";
const mainURL = (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
  ? Local_Base_URL
  : AWS_Base_URL;

const updateGalleryFromDataBase = async function (gallery) {
  let headers = new Headers();
  headers.append("Content-Type", "application/json");
  headers.append("Accept", "application/json");

  // The gallery object now may include summaryOutline and clusterSummaries
  const requestOptions = {
    method: "POST",
    headers: headers,
    body: JSON.stringify({
      gallery: gallery,
      user: localStorage.getItem("loggedInUser")
    }),
  };

  try {
    const response = await fetch(mainURL + "updateGallery", requestOptions);
    if (!response.ok) {
      const message = `An error has occurred: ${response.statusText}`;
      window.alert(message);
      return { data: [], tags: [] };
    }
    const result = await response.json();
    console.log("Update Gallery API result:", result);
    return result;
  } catch (error) {
    console.error("Error updating gallery:", error);
    return { data: [], tags: [] };
  }
};

export default updateGalleryFromDataBase;
