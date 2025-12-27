import React, { useEffect, useState, useRef, useMemo } from "react";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import { Card } from "react-bootstrap";
import { useLocation, useParams } from "react-router-dom";
import { makeStyles } from "@mui/styles";
import LockIcon from "@mui/icons-material/Lock";
import FaceIcon from "@mui/icons-material/Face";
import ModeEditOutlinedIcon from "@mui/icons-material/ModeEditOutlined";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import TextField from "@mui/material/TextField";
import FormControlLabel from "@mui/material/FormControlLabel";
import Checkbox from "@mui/material/Checkbox";
import DialogActions from "@mui/material/DialogActions";
import IconButton from "@mui/material/IconButton";
import DeleteIcon from "@mui/icons-material/Delete";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";

import getGalleries from "../api/getGalleriesApi";
import getSummary from "../api/getSummaryApi";
import updateGalleryFromDataBase from "../api/updateGalleryFromDataBaseApi";
import deleteGalleryFromDataBase from "../api/deleteGalleryFromDataBaseApi";
import saveGalleryIntoDataBase from "../api/saveGalleryApi";
import deleteArtworkFromGallery from "../api/deleteArtworkFromGalleryApi";

// --------------- STYLES ---------------
const useStyles = makeStyles(() => ({
  gridContainer: {
    marginLeft: "100px",
    marginTop: "100px",
  },
  clusterContainer: {
    display: "flex",
    border: "1px solid #ccc",
    marginBottom: "1rem",
    backgroundColor: "#fff",
  },
  keywordList: {
    flex: "0 0 200px",
    padding: "15px",
    borderRight: "1px solid #ccc",
  },
  mainKeywordTitle: {
    fontWeight: "bold",
    marginBottom: "15px",
    cursor: "pointer",
  },
  keywordButton: {
    marginBottom: "10px",
    width: "100%",
    textAlign: "left",
    padding: "5px 10px",
    backgroundColor: "#f8f8f8",
    borderRadius: "4px",
    cursor: "default",
  },
  highlightedPassages: {
    marginTop: "10px",
  },
  highlightedPassage: {
    backgroundColor: "yellow",
    padding: "5px",
    marginBottom: "5px",
    borderRadius: "4px",
    fontSize: "0.9rem",
  },
  artworkGrid: {
    flex: 1,
    padding: "30px",
  },
  clusterInner: {
    display: "flex",
    flexWrap: "wrap",
    gap: "1rem",
    minHeight: "150px",
    padding: "8px",
  },
  card: {
    width: "100%",
    marginBottom: "20px",
    position: "relative",
    "&:hover $deleteButton": {
      display: "flex",
    },
  },
  cardImage: {
    width: "100%",
    height: "200px",
    objectFit: "cover",
    margin: 0,
    padding: 0,
  },
  deleteButton: {
    display: "none",
    position: "absolute",
    top: "5px",
    left: "5px",
    backgroundColor: "red",
    color: "white",
    zIndex: 10,
    padding: "5px",
    minWidth: "24px",
    minHeight: "24px",
    borderRadius: "50%",
    justifyContent: "center",
    alignItems: "center",
    "&:hover": {
      backgroundColor: "darkred",
    },
  },
  summaryKeywordsBox: {
    backgroundColor: "#fff",
    border: "1px solid #ddd",
    padding: "10px",
    margin: "1px 120px 1px 150px",
    borderRadius: "4px",
  },
  keywordSummary: {
    display: "inline-block",
    backgroundColor: "yellow",
    padding: "5px 8px",
    margin: "5px",
    borderRadius: "3px",
    cursor: "pointer",
  },
  clusterSummary: {
    marginTop: "10px",
    fontSize: "0.9rem",
    color: "#555",
  },
}));

function getLicenseIcon(license) {
  if (license === "EXLIB") return "./uofrLogo.png";
  if (license === "WIKI") return "./wikipedia.png";
  return "./europeana.png";
}

const CardLogo = ({ src, alt = "Logo", style = {} }) => (
  <img src={src} alt={alt} style={{ width: "2.5rem", height: "2.5rem", ...style }} />
);

function Gallery() {
  const classes = useStyles();
  const location = useLocation();
  const { id } = useParams();
  let { galleryData } = location.state || {};

  const [galleryArtworks, setGalleryArtworks] = useState([]);
  const [clusters, setClusters] = useState([]);
  const [galleryName, setGalleryName] = useState("");
  const [galleryDescription, setGalleryDescription] = useState("");
  const [galleryPrivate, setGalleryPrivate] = useState(false);
  const [galleryImage, setGalleryImage] = useState("");
  const [summaryOutline, setSummaryOutline] = useState("");
  const [clusterSummaries, setClusterSummaries] = useState({});
  const [updatingGallery, setUpdatingGallery] = useState(false);
  const [isAddModalChildOpen, setIsAddModalChildOpen] = useState(false);
  const [keywordDialogOpen, setKeywordDialogOpen] = useState(false);
  const [selectedArtwork, setSelectedArtwork] = useState(null);
  const [editableContent, setEditableContent] = useState("");
  const [filterKeyword, setFilterKeyword] = useState(null);
  const [editingClusterIndex, setEditingClusterIndex] = useState(null);
  const [tempClusterLabel, setTempClusterLabel] = useState("");
  const [loadingGlobalSummary, setLoadingGlobalSummary] = useState(false);
  const [loadingClusterSummaries, setLoadingClusterSummaries] = useState(false);

  const artworkRefs = useRef({});

  const docIdMapping = useMemo(() => {
    const mapping = {};
    galleryArtworks.forEach((art, i) => {
      mapping[art.docId] = i + 1;
    });
    return mapping;
  }, [galleryArtworks]);

  const generateDocId = () => {
    return Math.random().toString(36).substr(2, 8);
  };

  useEffect(() => {
    if (!updatingGallery && galleryData) {
      const withDocIds = (galleryData.artworks || []).map((art) => {
        if (!art.docId) {
          art.docId = generateDocId();
          art.isNew = true;
        }
        return art;
      });

      setGalleryArtworks(withDocIds);
      setGalleryPrivate(galleryData.isPrivate);
      setGalleryName(galleryData.gallery);
      setGalleryDescription(galleryData.galleryDescription);
      setGalleryImage(galleryData.image);

      if (galleryData.summaryOutline) setSummaryOutline(galleryData.summaryOutline);
      if (galleryData.clusterSummaries) {
        setClusterSummaries(galleryData.clusterSummaries);
      }
    }
  }, [galleryData, updatingGallery]);

  useEffect(() => {
    if ((!galleryData || !galleryData._id) && id) {
      getGalleries(localStorage.getItem("loggedInUser"))
        .then((response) => {
          const found = response.galleries.find((g) => g._id === id);
          if (found) {
            const withDocIds = (found.artworks || []).map((art) => {
              if (!art.docId) {
                art.docId = generateDocId();
                art.isNew = true;
              }
              return art;
            });
            setGalleryArtworks(withDocIds);
            setGalleryPrivate(found.isPrivate);
            setGalleryName(found.gallery);
            setGalleryDescription(found.galleryDescription);
            setGalleryImage(found.image);
            if (found.summaryOutline) setSummaryOutline(found.summaryOutline);
            if (found.clusterSummaries) setClusterSummaries(found.clusterSummaries);
          }
        })
        .catch((err) => console.error("Error fetching galleries:", err));
    }
  }, [galleryData, id]);

  const clusterArtworksByLabels = (exArtworks = []) => {
    const clustersMap = new Map();

    exArtworks.forEach((doc) => {
      const originalLabel = doc.clusterLabel !== undefined ? doc.clusterLabel : "Unknown";
      if (!clustersMap.has(originalLabel)) {
        clustersMap.set(originalLabel, []);
      }
      clustersMap.get(originalLabel).push(doc);
    });

    return Array.from(clustersMap.entries()).map(([groupKey, arts]) => {
      const noOrder = arts.filter((a) => a.savedOrderId === undefined);
      const hasOrder = arts.filter((a) => a.savedOrderId !== undefined);

      noOrder.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
      hasOrder.sort((a, b) => a.savedOrderId - b.savedOrderId);

      const combined = [...noOrder, ...hasOrder];

      let finalLabel = combined[0].customClusterLabel || null;

      if (!finalLabel) {
        const keywordFreq = {};
        combined.forEach((art) => {
          (art.keywords || []).forEach((kw) => {
            keywordFreq[kw] = (keywordFreq[kw] || 0) + 1;
          });
        });

        let bestKeyword = null;
        let maxCount = 0;
        Object.entries(keywordFreq).forEach(([kw, count]) => {
          if (count > maxCount) {
            bestKeyword = kw;
            maxCount = count;
          }
        });

        finalLabel = bestKeyword
          ? bestKeyword.charAt(0).toUpperCase() + bestKeyword.slice(1)
          : `Cluster ${groupKey}`;
      }

      return {
        clusterLabel: finalLabel,
        originalLabel: groupKey,
        artworks: combined,
      };
    });
  };

  const updateClustersWithNewArtworks = async () => {
    const newOnes = galleryArtworks.filter(
      (art) => art.isNew && (!art.clusterLabel || art.clusterLabel === "Unknown")
    );
    if (!newOnes.length) return;

    const existing = galleryArtworks.filter(
      (art) => !art.isNew && art.clusterLabel && art.clusterLabel !== "Unknown"
    );

    if (!existing.length) {
      const updated = galleryArtworks.map((art) => {
        if (art.isNew && (!art.clusterLabel || art.clusterLabel === "Unknown")) {
          return {
            ...art,
            clusterLabel:
              art.keywords && art.keywords.length
                ? art.keywords[0]
                : "New Cluster",
            isNew: false,
          };
        }
        return art;
      });
      setGalleryArtworks(updated);
      return;
    }

    const updatedArtworks = galleryArtworks.map((art) => {
      if (art.isNew && (!art.clusterLabel || art.clusterLabel === "Unknown")) {
        return {
          ...art,
          clusterLabel: existing[0].clusterLabel || "New Cluster",
          isNew: false,
        };
      }
      return art;
    });
    setGalleryArtworks(updatedArtworks);
  };

  useEffect(() => {
    const hasNew = galleryArtworks.some(
      (a) => a.isNew && (!a.clusterLabel || a.clusterLabel === "Unknown")
    );
    if (hasNew) {
      updateClustersWithNewArtworks();
    }
  }, [galleryArtworks]);

  useEffect(() => {
    setClusters(clusterArtworksByLabels(galleryArtworks));
  }, [galleryArtworks]);

  const summaryKeywords = Array.from(
    new Set(
      galleryArtworks.flatMap((art) =>
        Array.isArray(art.highlights) ? art.highlights : []
      )
    )
  );

  const openKeywordDialog = (artwork) => {
    setSelectedArtwork(artwork);
    setEditableContent(artwork.description || "");
    setKeywordDialogOpen(true);
  };

  const applyHighlight = () => {
    document.execCommand("hiliteColor", false, "yellow");
    setEditableContent((prev) => prev);
  };

  const clearHighlights = () => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(editableContent, "text/html");
    doc.querySelectorAll("mark, span[style*='background-color: yellow']").forEach((el) => {
      el.outerHTML = el.innerHTML;
    });
    setEditableContent(doc.body.innerHTML);
  };

  const extractHighlights = (html) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const highlightedElements = doc.querySelectorAll(
      "mark, span[style*='background-color: yellow']"
    );
    const keywords = [];
    highlightedElements.forEach((el) => {
      const text = el.textContent.trim();
      if (text) keywords.push(text);
    });
    return keywords;
  };

  // -------------- AUTO SUMMARIZE HELPER ----------------
  const autoSummarize = async () => {
    await handleGlobalSummaryClick();
    await handleClusterSummariesClick();
  };
  // -----------------------------------------------------

  const saveHighlights = async () => {
    if (selectedArtwork) {
      const highlights = extractHighlights(editableContent);
      const updatedArtwork = {
        ...selectedArtwork,
        description: editableContent,
        highlights,
      };
      const updatedArtworks = galleryArtworks.map((art) =>
        art.artworkId === selectedArtwork.artworkId ? updatedArtwork : art
      );
      setGalleryArtworks(updatedArtworks);

      const updatedGallery = {
        _id: id || galleryData._id,
        gallery: galleryName,
        image: galleryImage,
        artworks: updatedArtworks,
        galleryDescription,
        isPrivate: galleryPrivate,
        summaryOutline,
        clusterSummaries,
      };
      try {
        await updateGalleryFromDataBase(updatedGallery);
      } catch (err) {
        console.error("Error updating gallery with highlights:", err);
      }
      setKeywordDialogOpen(false);

      // ------ TRIGGER AUTO SUMMARY --------
      await autoSummarize();
      // ------------------------------------
    }
  };

  const handleGalleryNameChange = (e) => setGalleryName(e.target.value);
  const handleGalleryDescriptionChange = (e) => setGalleryDescription(e.target.value);
  const handleGalleryPublicChange = (e) => setGalleryPrivate(e.target.checked);

  const handleCreateNewGalleryCardClick = () =>
    setIsAddModalChildOpen(!isAddModalChildOpen);

  const handleCreateGallerySubmit = async (e) => {
    e.preventDefault();
    if (!galleryName) return;
    try {
      await saveGalleryIntoDataBase(
        "",
        galleryName,
        "",
        galleryDescription,
        galleryPrivate
      );
      await getGalleries(localStorage.getItem("loggedInUser"));
    } catch (err) {
      console.error(err);
    }
    setGalleryName("");
    setGalleryDescription("");
    setGalleryPrivate(false);
    setIsAddModalChildOpen(!isAddModalChildOpen);
  };

  const handleUpdateGallery = async () => {
    setUpdatingGallery(false);
    const updatedGallery = {
      _id: id || galleryData._id,
      gallery: galleryName,
      image: galleryImage,
      artworks: galleryArtworks,
      galleryDescription,
      isPrivate: galleryPrivate,
      summaryOutline,
      clusterSummaries,
    };
    await updateGalleryFromDataBase(updatedGallery);
    const response = await getGalleries(localStorage.getItem("loggedInUser"));
    const found = response.galleries.find(
      (g) => g._id === (id || galleryData._id)
    );
    if (found) {
      setGalleryPrivate(found.isPrivate);
      setGalleryName(found.gallery);
      setGalleryDescription(found.galleryDescription);
      if (found.summaryOutline) setSummaryOutline(found.summaryOutline);
      if (found.clusterSummaries) setClusterSummaries(found.clusterSummaries);
    }
    setIsAddModalChildOpen(!isAddModalChildOpen);
    setUpdatingGallery(true);
  };

  const handleDeleteGallery = async () => {
    await deleteGalleryFromDataBase(
      galleryName,
      localStorage.getItem("loggedInUser")
    );
    window.location.href = "/UserProfile";
  };

  const handleDeleteArtwork = async (artworkId) => {
    try {
      await deleteArtworkFromGallery(
        artworkId,
        id || galleryData._id,
        localStorage.getItem("loggedInUser")
      );
      const updatedArtworks = galleryArtworks.filter(
        (art) => art.artworkId !== artworkId
      );
      setGalleryArtworks(updatedArtworks);

      const userGalleriesRes = await getGalleries(localStorage.getItem("loggedInUser"));
      const allGalleries = userGalleriesRes.galleries || [];

      const lowerArtId = String(artworkId).toLowerCase();
      let isStillSaved = false;

      for (const gal of allGalleries) {
        if ((gal.artworks || []).some((a) =>
          String(a.artworkId).toLowerCase() === lowerArtId
        )) {
          isStillSaved = true;
          break;
        }
      }

      if (!isStillSaved) {
        const savedArtworksString = localStorage.getItem("savedArtworks") || "{}";
        const savedArtworksObj = JSON.parse(savedArtworksString);

        delete savedArtworksObj[lowerArtId];
        localStorage.setItem("savedArtworks", JSON.stringify(savedArtworksObj));
      }
      // ------ TRIGGER AUTO SUMMARY --------
      await autoSummarize();
      // ------------------------------------
    } catch (err) {
      console.error("Error deleting artwork:", err);
    }
  };

  const handleCardClick = (artwork, e) => {
    let currentElement = e.target;
    let isInsideDataAndButtonsWrapper = false;
    while (currentElement) {
      if (
        currentElement.classList.contains("MuiSvgIcon-root") ||
        currentElement.classList.contains("bullet-pad-left") ||
        currentElement.classList.contains("bullet")
      ) {
        isInsideDataAndButtonsWrapper = true;
        break;
      }
      currentElement = currentElement.parentElement;
    }
    if (isInsideDataAndButtonsWrapper) return;

    if (artwork.isNew) {
      artwork.isNew = false;
      artwork.savedAt = new Date().toISOString();
      setGalleryArtworks([...galleryArtworks]);
    }

    let link = "";
    if (artwork.url) {
      link = artwork.url;
    } else if (artwork.license === "EXLIB") {
      link =
        "https://casls-regina.primo.exlibrisgroup.com/discovery/fulldisplay?docid=" +
        artwork.artworkId +
        "&vid=01CASLS_REGINA:01CASLS_REGINA";
    } else if (artwork.license === "WIKI") {
      link =
        "https://en.wikipedia.org/wiki/" + encodeURIComponent(artwork.title);
    } else {
      link = "https://www.europeana.eu/en/item" + artwork.artworkId;
    }
    window.open(link, "_blank");
  };

  const parseDocIdReferences = (text, mapping) => {
    const regex = /\[docId:\s*([^\]]+)\]/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      const docId = match[1].trim();
      const docNumber = mapping[docId] || "?";
      const startIndex = match.index;
      if (startIndex > lastIndex) {
        parts.push(text.slice(lastIndex, startIndex));
      }
      parts.push(
        <span
          key={`docref-${docId}-${startIndex}`}
          style={{ color: "blue", textDecoration: "underline", cursor: "pointer" }}
          onClick={() => scrollToDocId(docId)}
        >
          [{docNumber}]
        </span>
      );
      lastIndex = regex.lastIndex;
    }
    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }
    return parts;
  };

  // ── summary helper ───────────────────────────────────────────────
const processSummaryAsBulletPoints = (summary) => {
  /* 1️⃣ de-duplicate lines (ignore blank ones) */
  const seen = new Set();
  const bulletLines = summary
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !seen.has(l) && seen.add(l));

  /* 2️⃣ tiny util: turn **something** into <strong>something</strong>  */
  const boldifyFragments = (fragments) =>
    fragments.flatMap((frag, idx) => {
      if (typeof frag !== "string") return frag;                // spans from parseDocIdReferences
      return frag
        .split(/(\*\*[^*]+\*\*)/g)                              // keep **…** tokens
        .filter(Boolean)
        .map((part, i) =>
          part.startsWith("**") && part.endsWith("**") ? (
            <strong key={`${idx}-${i}`}>{part.slice(2, -2)}</strong>
          ) : (
            part
          )
        );
    });

  return (
    <ul>
      {bulletLines.map((rawLine, index) => {
        /* strip any leading dash / bullet chars */
        const cleaned = rawLine.replace(/^[-\u2022]+\s*/, "");

        /* keep [docId: …] links intact, then boldify */
        const withDocLinks = parseDocIdReferences(cleaned, docIdMapping);
        const finalLine    = boldifyFragments(withDocLinks);

        return <li key={index}>{finalLine}</li>;
      })}
    </ul>
  );
};

  const scrollToDocId = (docId) => {
    const el = artworkRefs.current[docId];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("highlighted");
      setTimeout(() => el.classList.remove("highlighted"), 1500);
    }
  };

  // --- These two methods are now called only by autoSummarize()! ---
  const handleGlobalSummaryClick = async () => {
    setLoadingGlobalSummary(true);
    try {
      const aggregatedEuropeanaText = galleryArtworks
        .filter(
          (item) =>
            !item.rights ||
            (!item.rights.includes("EXLIB") && !item.rights.includes("WIKI"))
        )
        .map((item) => `${item.title || ""} ${item.description || ""}`)
        .join(" ");

      const aggregatedWikipediaText = galleryArtworks
        .filter((item) => item.rights && item.rights.includes("WIKI"))
        .map((item) => `${item.title || ""} ${item.description || ""}`)
        .join(" ");

      const aggregatedLibraryText = galleryArtworks
        .filter((item) => item.rights && item.rights.includes("EXLIB"))
        .map((item) => `${item.title || ""} ${item.description || ""}`)
        .join(" ");

      const mappingStr = galleryArtworks
        .map((art) => `[docId: ${art.docId}]: ${art.title || ""}`)
        .join("\n");

      const resp = await getSummary(
        summaryKeywords,
        aggregatedEuropeanaText,
        aggregatedWikipediaText,
        aggregatedLibraryText,
        "",
        mappingStr
      );

      if (resp && resp.success === "true") {
        setSummaryOutline(resp.summary);
        const updatedGallery = {
          _id: id || galleryData._id,
          gallery: galleryName,
          image: galleryImage,
          artworks: galleryArtworks,
          galleryDescription,
          isPrivate: galleryPrivate,
          summaryOutline: resp.summary,
          clusterSummaries,
        };
        await updateGalleryFromDataBase(updatedGallery);
      } else {
        setSummaryOutline("Summary generation failed.");
      }
    } catch (err) {
      console.error("Global summary error:", err);
      setSummaryOutline("Summary generation failed.");
    } finally {
      setLoadingGlobalSummary(false);
    }
  };

  const handleClusterSummariesClick = async () => {
    setLoadingClusterSummaries(true);
    try {
      const newClusterSummaries = {};

      for (const cluster of clusters) {
        const clusterKeywords = Array.from(
          new Set(
            cluster.artworks.flatMap((art) =>
              Array.isArray(art.highlights) ? art.highlights : []
            )
          )
        );
        const aggregatedEuropeanaText = cluster.artworks
          .filter(
            (item) =>
              !item.rights ||
              (!item.rights.includes("EXLIB") && !item.rights.includes("WIKI"))
          )
          .map((item) => `${item.title || ""} ${item.description || ""}`)
          .join(" ");

        const aggregatedWikipediaText = cluster.artworks
          .filter((item) => item.rights && item.rights.includes("WIKI"))
          .map((item) => `${item.title || ""} ${item.description || ""}`)
          .join(" ");

        const aggregatedLibraryText = cluster.artworks
          .filter((item) => item.rights && item.rights.includes("EXLIB"))
          .map((item) => `${item.title || ""} ${item.description || ""}`)
          .join(" ");

        const mappingStr = cluster.artworks
          .map((art) => `[docId: ${art.docId}]: ${art.title || ""}`)
          .join("\n");

        const resp = await getSummary(
          clusterKeywords,
          aggregatedEuropeanaText,
          aggregatedWikipediaText,
          aggregatedLibraryText,
          "",
          mappingStr
        );
        newClusterSummaries[cluster.clusterLabel] =
          resp && resp.success === "true"
            ? resp.summary
            : "Summary generation failed.";
      }

      setClusterSummaries(newClusterSummaries);
      const updatedGallery = {
        _id: id || galleryData._id,
        gallery: galleryName,
        image: galleryImage,
        artworks: galleryArtworks,
        galleryDescription,
        isPrivate: galleryPrivate,
        summaryOutline,
        clusterSummaries: newClusterSummaries,
      };
      await updateGalleryFromDataBase(updatedGallery);
    } catch (err) {
      console.error("Cluster summary error:", err);
    } finally {
      setLoadingClusterSummaries(false);
    }
  };

  // DRAG/DROP -- trigger auto summarize after updating database
  const updateGalleryOrderInDatabase = async (newArtworks) => {
    const updatedArtworks = newArtworks.map((art, index) => ({
      ...art,
      savedOrderId: index,
    }));
    const updatedGallery = {
      _id: id || (galleryData && galleryData._id),
      gallery: galleryName,
      image: galleryImage,
      artworks: updatedArtworks,
      galleryDescription,
      isPrivate: galleryPrivate,
      summaryOutline,
      clusterSummaries,
    };
    try {
      await updateGalleryFromDataBase(updatedGallery);
    } catch (err) {
      console.error("Error updating gallery order:", err);
    }
    setGalleryArtworks(updatedArtworks);
    // ------ TRIGGER AUTO SUMMARY --------
    await autoSummarize();
    // ------------------------------------
  };

  const startEditingClusterLabel = (index) => {
    setEditingClusterIndex(index);
    setTempClusterLabel(clusters[index].clusterLabel);
  };

  const saveClusterLabel = async (index) => {
    const newClusters = [...clusters];
    newClusters[index].clusterLabel = tempClusterLabel;

    newClusters[index].artworks.forEach((art) => {
      art.customClusterLabel = tempClusterLabel;
      art.clusterLabel = newClusters[index].originalLabel;
    });

    setClusters(newClusters);

    const updatedArtworks = newClusters.flatMap((cluster) => cluster.artworks);
    await updateGalleryOrderInDatabase(updatedArtworks);

    setEditingClusterIndex(null);
    setTempClusterLabel("");
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    if (result.type === "CLUSTER") {
      const newClusters = Array.from(clusters);
      const [removed] = newClusters.splice(result.source.index, 1);
      newClusters.splice(result.destination.index, 0, removed);
      setClusters(newClusters);

      const newGalleryArtworks = newClusters.reduce(
        (acc, c) => acc.concat(c.artworks),
        []
      );
      updateGalleryOrderInDatabase(newGalleryArtworks);
    } else if (result.type === "ARTWORK") {
      const sourceClusterIndex = parseInt(result.source.droppableId.replace("cluster-", ""), 10);
      const destClusterIndex   = parseInt(result.destination.droppableId.replace("cluster-", ""), 10);

      const newClusters = Array.from(clusters);

      const sourceCluster = { ...newClusters[sourceClusterIndex] };
      const destCluster = { ...newClusters[destClusterIndex] };

      const sourceArts = Array.from(sourceCluster.artworks);
      const [movedArtwork] = sourceArts.splice(result.source.index, 1);

      if (movedArtwork.isNew) {
        movedArtwork.isNew = false;
      }

      if (sourceClusterIndex === destClusterIndex) {
        sourceArts.splice(result.destination.index, 0, movedArtwork);
        sourceCluster.artworks = sourceArts;
        newClusters[sourceClusterIndex] = sourceCluster;
      } else {
        const destArts = Array.from(destCluster.artworks);
        destArts.splice(result.destination.index, 0, movedArtwork);
        movedArtwork.clusterLabel = destCluster.originalLabel || "Unknown";
        sourceCluster.artworks = sourceArts;
        destCluster.artworks = destArts;
        newClusters[sourceClusterIndex] = sourceCluster;
        newClusters[destClusterIndex] = destCluster;
      }

      setClusters(newClusters);
      const newGalleryArtworks = newClusters.reduce(
        (acc, c) => acc.concat(c.artworks),
        []
      );
      updateGalleryOrderInDatabase(newGalleryArtworks);
    }
  };

  const getCommonKeywords = (artworks) => {
    if (!artworks.length) return [];

    const keywordCounts = {};
    artworks.forEach(art => {
      (Array.isArray(art.keywords) ? art.keywords : []).forEach(kw => {
        const normalizedKw = kw.trim().toLowerCase();
        keywordCounts[normalizedKw] = (keywordCounts[normalizedKw] || 0) + 1;
      });
    });

    const sortedKeywords = Object.entries(keywordCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([kw]) => kw);

    return sortedKeywords.slice(0, 5);
  };

  const ClustersView = () => {
    return (
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="all-clusters" type="CLUSTER">
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps}>
              {clusters.map((cluster, clusterIndex) => (
                <Draggable
                  draggableId={`cluster-${clusterIndex}`}
                  index={clusterIndex}
                  key={`cluster-${clusterIndex}`}
                >
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      style={{
                        marginBottom: "1rem",
                        ...provided.draggableProps.style,
                      }}
                    >
                      <div className={classes.clusterContainer}>
                        <div className={classes.keywordList}>
                          {editingClusterIndex === clusterIndex ? (
                            <input
                              style={{ fontSize: "1.1em", fontWeight: "bold" }}
                              value={tempClusterLabel}
                              onChange={(e) => setTempClusterLabel(e.target.value)}
                              onBlur={() => saveClusterLabel(clusterIndex)}
                              autoFocus
                            />
                          ) : (
                            <h5
                              className={classes.mainKeywordTitle}
                              onClick={() => startEditingClusterLabel(clusterIndex)}
                            >
                              {cluster.clusterLabel}
                            </h5>
                          )}
                          {getCommonKeywords(cluster.artworks).map((kw, ix) => (
                            <div key={ix} className={classes.keywordButton}>
                              {kw}
                            </div>
                          ))}
                          <hr />
                          {/* Highlights in this cluster */}
                          <div className={classes.highlightedPassages}>
                            <Typography variant="subtitle2">
                              Highlighted Passages
                            </Typography>
                            {Array.from(
                              new Set(
                                cluster.artworks.flatMap((art) =>
                                  Array.isArray(art.highlights) ? art.highlights : []
                                )
                              )
                            ).map((passage, idx) => (
                              <div key={idx} className={classes.highlightedPassage}>
                                {passage}
                              </div>
                            ))}
                          </div>
                          <hr />
                          <div className={classes.clusterSummary}>
                            <Typography variant="subtitle2">
                              Cluster Summary
                            </Typography>
                            {loadingClusterSummaries ? (
                              <CircularProgress size={24} />
                            ) : clusterSummaries[cluster.clusterLabel] ? (
                              processSummaryAsBulletPoints(
                                clusterSummaries[cluster.clusterLabel]
                              )
                            ) : (
                              "No summary available."
                            )}
                          </div>
                        </div>
                        <div className={classes.artworkGrid}>
                          <div
                            {...provided.dragHandleProps}
                            style={{
                              marginBottom: "0.5rem",
                              cursor: "grab",
                            }}
                          >
                            <Typography variant="subtitle2">Drag cluster</Typography>
                          </div>
                          <Droppable
                            droppableId={`cluster-${clusterIndex}`}
                            type="ARTWORK"
                          >
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.droppableProps}
                                className={classes.clusterInner}
                                style={{
                                  border: snapshot.isDraggingOver
                                    ? "2px dashed blue"
                                    : "none",
                                }}
                              >
                                {cluster.artworks.map((art, idx) => (
                                  <Draggable
                                    draggableId={art.artworkId.toString()}
                                    index={idx}
                                    key={art.artworkId}
                                  >
                                    {(provided) => (
                                      <div
                                        ref={(el) => {
                                          provided.innerRef(el);
                                          if (art.docId) {
                                            artworkRefs.current[art.docId] = el;
                                          }
                                        }}
                                        {...provided.draggableProps}
                                        {...provided.dragHandleProps}
                                        style={{
                                          margin: "0.5rem",
                                          width: "300px",
                                          ...provided.draggableProps.style,
                                        }}
                                      >
                                        <Card
                                          className={classes.card}
                                          onClick={(e) => handleCardClick(art, e)}
                                        >
                                          <div style={{ position: "relative" }}>
                                            {art.isNew && (
                                              <div
                                                style={{
                                                  position: "absolute",
                                                  top: "5px",
                                                  right: "5px",
                                                  backgroundColor: "yellow",
                                                  padding: "4px 8px",
                                                  borderRadius: "12px",
                                                  zIndex: 11,
                                                  fontWeight: "bold",
                                                  fontSize: "0.8rem",
                                                }}
                                              >
                                                NEW
                                              </div>
                                            )}
                                            {art.image &&
                                              art.image !== "No image available" ? (
                                              <Card.Img
                                                src={art.image}
                                                alt={`Artwork for ${art.title}`}
                                                className={classes.cardImage}
                                              />
                                            ) : (
                                              <Card.Img
                                                src="./url.png"
                                                alt="Fallback"
                                                className={classes.cardImage}
                                              />
                                            )}
                                            <IconButton
                                              aria-label="delete"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteArtwork(art.artworkId);
                                              }}
                                              className={classes.deleteButton}
                                            >
                                              <DeleteIcon fontSize="small" />
                                            </IconButton>

                                            <div
                                              style={{
                                                position: "absolute",
                                                bottom: "5px",
                                                right: "5px",
                                                backgroundColor: "rgba(255,255,255,0.8)",
                                                padding: "2px 5px",
                                                fontSize: "0.7rem",
                                                borderRadius: "4px",
                                              }}
                                            >
                                              [{docIdMapping[art.docId]}]
                                            </div>
                                          </div>
                                          <Card.Body>
                                            <div
                                              style={{
                                                display: "flex",
                                                alignItems: "center",
                                              }}
                                            >
                                              <CardLogo
                                                src={getLicenseIcon(art.license)}
                                                alt="License Logo"
                                              />
                                              <Card.Subtitle style={{ marginLeft: "10px" }}>
                                                {art.dataProvider}
                                              </Card.Subtitle>
                                            </div>
                                            <Card.Title>
                                              {art.title === "null" ? "" : art.title}
                                            </Card.Title>
                                            <Card.Text>
                                              {art.description ? (
                                                <span
                                                  dangerouslySetInnerHTML={{
                                                    __html: art.description.slice(0, 250),
                                                  }}
                                                />
                                              ) : null}
                                            </Card.Text>
                                            <Button
                                              variant="outlined"
                                              size="small"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                openKeywordDialog(art);
                                              }}
                                            >
                                              Highlight Passages
                                            </Button>
                                          </Card.Body>
                                        </Card>
                                      </div>
                                    )}
                                  </Draggable>
                                ))}
                                {provided.placeholder}
                              </div>
                            )}
                          </Droppable>
                        </div>
                      </div>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    );
  };

  return (
    <>
      <Grid container spacing={5} direction="row" className={classes.gridContainer} style={{ padding: "30px" }}>
        <Grid item xs={12}>
          <Typography variant="body1">GALLERY</Typography>
        </Grid>
        <Grid item xs={12}>
          <Typography variant="h3" style={{ fontWeight: "bold" }}>
            {galleryName}
          </Typography>
        </Grid>
        <Grid item xs={12}>
          <Grid container spacing={2} alignItems="center">
            <Grid item>
              <Typography variant="body2">
                <FaceIcon style={{ verticalAlign: "middle", marginRight: "5px" }} />
                Curated by @{localStorage.getItem("loggedInUser")}
              </Typography>
            </Grid>
            {galleryPrivate && (
              <Grid item>
                <Typography variant="body2">
                  <LockIcon style={{ verticalAlign: "middle", marginRight: "5px" }} />
                  Private gallery
                </Typography>
              </Grid>
            )}
            <Grid item style={{ marginLeft: "auto" }}>
              <Button
                className="gallery-edit-btn"
                color="secondary"
                style={{
                  background: "#f1f1ee",
                  border: "1px solid #f1f1ee",
                  borderRadius: "0.25rem",
                  color: "#4d4d4d",
                  fontSize: ".875rem",
                  fontWeight: "600",
                  textTransform: "uppercase",
                }}
                onClick={handleCreateNewGalleryCardClick}
              >
                <ModeEditOutlinedIcon /> Edit
              </Button>
            </Grid>
          </Grid>
        </Grid>
      </Grid>

      {/* SUMMARY SECTION */}
      <div
        style={{
          margin: "20px 120px 20px 150px",
          padding: "10px",
          border: "1px solid #ddd",
          borderRadius: "4px",
          backgroundColor: "#fff",
        }}
      >
        <Typography variant="h6">Summary</Typography>
        {/* --- BUTTONS REMOVED: automatic summary now --- */}
        <div>
          {loadingGlobalSummary ? (
            <CircularProgress size={24} />
          ) : summaryOutline ? (
            processSummaryAsBulletPoints(summaryOutline)
          ) : (
            ""
          )}
        </div>
      </div>

      {/* HIGHLIGHTED KEYWORDS */}
      <div className={classes.summaryKeywordsBox} style={{ marginBottom: "20px" }}>
        <Typography variant="h6">Highlighted Passages</Typography>
        {summaryKeywords.map((kw, idx) => (
          <span
            key={idx}
            className={classes.keywordSummary}
            onClick={() => setFilterKeyword(kw)}
          >
            {kw}
          </span>
        ))}
        {filterKeyword && (
          <Button
            onClick={() => setFilterKeyword(null)}
            variant="text"
            style={{ marginLeft: "10px" }}
          >
            Clear Filter
          </Button>
        )}
      </div>

      {/* CLUSTERS / ARTWORKS */}
      <Grid container spacing={1} direction="row" style={{ backgroundColor: "#ededed" }}>
        <Grid item xs={12} style={{ paddingLeft: "150px", paddingTop: "10px" }}>
          {galleryArtworks.length > 1 ? "" : "ITEM"}
        </Grid>
        <Grid item xs={12} style={{ paddingLeft: "120px", paddingRight: "50px" }}>
          <ClustersView />
        </Grid>
      </Grid>

      {/* EDIT GALLERY DIALOG */}
      <Dialog
        sx={{
          top: "-5%",
          "& .MuiBackdrop-root": { opacity: "0.9" },
        }}
        open={isAddModalChildOpen}
        keepMounted
        onClose={() => setIsAddModalChildOpen(!isAddModalChildOpen)}
        aria-describedby="alert-dialog-slide-description"
      >
        <DialogTitle>Edit gallery</DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-slide-description">
            <form onSubmit={handleCreateGallerySubmit}>
              <label>Gallery name</label>
              <TextField
                required
                variant="outlined"
                value={galleryName}
                onChange={handleGalleryNameChange}
                style={{
                  maxWidth: "750px",
                  minWidth: "550px",
                  marginBottom: "0",
                }}
                fullWidth
              />
              <br />
              <br />
              <label>Gallery description</label>
              <TextField
                multiline
                rows={4}
                variant="outlined"
                value={galleryDescription}
                onChange={handleGalleryDescriptionChange}
                fullWidth
              />
              <FormControlLabel
                style={{ marginLeft: "1px" }}
                control={
                  <Checkbox
                    checked={galleryPrivate}
                    onChange={handleGalleryPublicChange}
                  />
                }
                label="Keep this gallery private"
              />
            </form>
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Grid container spacing={2}>
            <Grid item xs={3}>
              <Button
                style={{
                  border: "2px solid black",
                  backgroundColor: "white",
                  cursor: "pointer",
                  borderColor: "#2196F3",
                  color: "dodgerblue",
                  maxWidth: "85px",
                  minWidth: "65px",
                  marginLeft: "10px",
                  marginBottom: "20px",
                }}
                variant="outlined"
                onClick={() => setIsAddModalChildOpen(!isAddModalChildOpen)}
              >
                Close
              </Button>
            </Grid>
            <Grid item xs={1}></Grid>
            <Grid item xs={4} style={{ textAlign: "right" }}>
              <Button
                style={{ backgroundColor: "#dc3545", fontSize: ".875rem" }}
                variant="contained"
                onClick={handleDeleteGallery}
              >
                DELETE GALLERY
              </Button>
            </Grid>
            <Grid item xs={4}>
              <Button
                style={{ backgroundColor: "#0a72cc", fontSize: ".875rem" }}
                variant="contained"
                onClick={handleUpdateGallery}
              >
                UPDATE GALLERY
              </Button>
            </Grid>
          </Grid>
        </DialogActions>
      </Dialog>

      {/* KEYWORD HIGHLIGHTING DIALOG */}
      <Dialog
        open={keywordDialogOpen}
        onClose={() => setKeywordDialogOpen(false)}
        maxWidth="md"
        fullWidth
        aria-labelledby="keyword-dialog-title"
      >
        <DialogTitle id="keyword-dialog-title">Highlight Passages</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Select any text below and click "Highlight Passages" to highlight it in yellow.
          </DialogContentText>
          <div
            contentEditable
            suppressContentEditableWarning
            style={{
              border: "1px solid #ccc",
              padding: "10px",
              minHeight: "100px",
              marginTop: "10px",
              backgroundColor: "#f9f9f9",
              cursor: "text",
            }}
            dangerouslySetInnerHTML={{ __html: editableContent }}
            onInput={(e) => setEditableContent(e.currentTarget.innerHTML)}
          />
          <div style={{ marginTop: "10px" }}>
            <Button
              variant="outlined"
              onClick={applyHighlight}
              style={{ marginRight: "10px" }}
            >
              Highlight Selection
            </Button>
            <Button variant="outlined" onClick={clearHighlights}>
              Clear Highlights
            </Button>
          </div>
          <div style={{ marginTop: "20px" }}>
            <Typography variant="subtitle1">Current Highlighted Passages:</Typography>
            <div>
              {extractHighlights(editableContent).map((kw, idx) => (
                <span
                  key={idx}
                  style={{
                    backgroundColor: "yellow",
                    padding: "3px 6px",
                    margin: "3px",
                    display: "inline-block",
                    borderRadius: "3px",
                  }}
                >
                  {kw}
                </span>
              ))}
            </div>
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={saveHighlights} color="primary" variant="contained">
            Save
          </Button>
          <Button
            onClick={() => setKeywordDialogOpen(false)}
            color="secondary"
            variant="outlined"
          >
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default Gallery;
