// getRecordsApi.js

import getUserLikedArtworks from "./getUserLikedArtworksApi";

const AWS_Base_URL = "http://ec2-3-143-18-63.us-east-2.compute.amazonaws.com:3005/";
const Local_Base_URL = "http://localhost:3001/";
const mainURL =
  window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? Local_Base_URL
    : AWS_Base_URL;

const getRecords = async function (searchInput, filterQuery, pageNumber) {
  if (
    localStorage.getItem("firstRun") !== null &&
    localStorage.getItem("firstRun") !== "true"
  ) {
    localStorage.setItem("currentQuery", searchInput);
    localStorage.setItem("currentFilter", filterQuery);

    let dataObject = {
      items: [],
      artworkData: [],
      totalPages: 0,
    };

    const headers = new Headers();
    headers.append("Content-Type", "application/json");
    headers.append("Accept", "application/json");
    headers.append("Access-Control-Allow-Origin", "*");
    headers.append("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");

    const requestOptions = {
      method: "POST",
      headers: headers,
      body: JSON.stringify({
        searchInput: searchInput,
        filterQuery: filterQuery,
        pageNumber: pageNumber,
      }),
    };

    const response = await fetch(mainURL + "recordList", requestOptions);
    if (!response.ok) {
      console.log("response.ok", response.ok);
      return dataObject;
    }

    const result = await response.json();

    const res = await getUserLikedArtworks();
    const likedArtwork = res.likedArtworks && res.likedArtworks.length !== 0
      ? res.likedArtworks[0].artworks
      : [];
    const likedArtworkIds = new Set(likedArtwork.map((artwork) => artwork.artworkId));

    console.log("ids: ", likedArtworkIds);
    console.log("res: ", res);

    let artworkData = result.data
      ? result.data.items.map((artwork) => ({
          artworkId: artwork.id,
          title: Array.isArray(artwork.title) ? artwork.title[0] : artwork.title,
          license: Array.isArray(artwork.rights) ? artwork.rights[0] : artwork.rights,
          dataProvider: Array.isArray(artwork.dataProvider) ? artwork.dataProvider[0] : artwork.dataProvider,
          dcCreator: artwork.dcCreator ? (Array.isArray(artwork.dcCreator) ? artwork.dcCreator[0] : artwork.dcCreator) : "",
          type: artwork.type,
          image: artwork.edmPreview
            ? Array.isArray(artwork.edmPreview)
              ? artwork.edmPreview[0]
              : artwork.edmPreview
            : "No image available",
          description: artwork.dcDescription
            ? Array.isArray(artwork.dcDescription)
              ? artwork.dcDescription[0]
              : artwork.dcDescription
            : "",
          keywords: artwork.keywords || [], // Use the keywords provided by the backend
          clusterLabel: artwork.clusterLabel, // Include cluster label
          liked: likedArtworkIds.has(artwork.id),
        }))
      : [];

    dataObject = {
      items: result.data ? result.data.items : [],
      artworkData: artworkData,
      totalPages: result.data ? result.data.totalResults : 0,
    };
    return dataObject;
  }
};

export default getRecords;
