import React, {
  useState,
  useEffect,
  forwardRef,
  useRef,
  useImperativeHandle,
} from "react";
import "../css/common.css";
import { Container, Col, Button, Card, Row } from "react-bootstrap";
import Auth from "../utils/auth";
import { saveArtworkIds, getSavedArtworkIds } from "../utils/localStorage";
import { SAVE_ARTWORK } from "../utils/mutations";
import { useMutation } from "@apollo/react-hooks";
import "./SearchArtworks.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faArrowRight } from "@fortawesome/free-solid-svg-icons";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import getRecords from "../api/getRecordsApi";
import Chip from "@mui/material/Chip";
import { makeStyles, withStyles } from "@mui/styles";
import CircularProgress from "@mui/material/CircularProgress";
import Grid from "@mui/material/Grid";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogActions from "@mui/material/DialogActions";
import DialogContentText from "@mui/material/DialogContentText";
import DialogContent from "@mui/material/DialogContent";
import Slide from "@mui/material/Slide";
import TextField from "@mui/material/TextField";
import FormControlLabel from "@mui/material/FormControlLabel";
import Checkbox from "@mui/material/Checkbox";
import saveGalleryIntoDataBase from "../api/saveGalleryApi";
import saveLikedArtworkIntoDataBase from "../api/saveLikedArtworksApi";
import deleteArtworkFromGallery from "../api/deleteArtworkFromGalleryApi";
import deleteLikedArtworkFromDataBase from "../api/deleteLikedArtworkFromDataBaseApi";
import getGalleries from "../api/getGalleriesApi";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

// ----------------------
// Merge Data in Round Robin Order
// ----------------------
function mergeDataRoundRobin(europeanaItems, exLibrisItems, wikipediaItems) {
  const mergedItems = [];
  const maxLength = Math.max(europeanaItems.length, exLibrisItems.length, wikipediaItems.length);
  for (let i = 0; i < maxLength; i++) {
    if (i < europeanaItems.length) {
      mergedItems.push(europeanaItems[i]);
    }
    if (i < exLibrisItems.length) {
      mergedItems.push(exLibrisItems[i]);
    }
    if (i < wikipediaItems.length) {
      mergedItems.push(wikipediaItems[i]);
    }
  }
  return mergedItems;
}

const StyledChip = withStyles({
  label: {
    marginRight: -3,
  },
  icon: {
    position: "absolute",
    right: 10,
    backgroundColor: "#000",
  },
})(Chip);

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="down" ref={ref} {...props} />;
});

const SearchArtworks = ({
  isLoading,
  totalPages,
  searchedArtworks,
  filters,
  onFilterChange,
  onChipDelete,
}) => {
  const [savedArtworkIds, setSavedArtworkIds] = useState(getSavedArtworkIds());
  const [currentPage, setCurrentPage] = useState(1);
  const [filterQuery, setFilterQuery] = useState("");
  const [totalRecords, setTotalRecords] = useState(0);
  const [artworkData, setArtworkData] = useState([]);
  const [showProgressbar, setShowProgressbar] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAddModalChildOpen, setIsAddModalChildOpen] = useState(false);
  const [galleryName, setGalleryName] = useState("");
  const [galleryDescription, setGalleryDescription] = useState("");
  const [galleryPrivate, setGalleryPrivate] = useState(false);
  const [addedArtworkToGallery, setAddedArtworkToGallery] = useState("");
  const [addedArtworkImageToGallery, setAddedArtworkImageToGallery] = useState("");
  const [userGalleries, setUserGalleries] = useState([]);
  const [pageIsLoading, setPageIsLoading] = useState(false);
  const [savedArtworks, setSavedArtworks] = useState(() => {
    const saved = localStorage.getItem("savedArtworks");
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    console.log("savedArtworks in SearchArtworks updated:", savedArtworks);
  }, [savedArtworks]);

  useEffect(() => {
    const fetchArtworks = async () => {
      setShowProgressbar(true);
      setPageIsLoading(true);
      const response = await getRecords(
        localStorage.getItem("currentQuery"),
        filterQuery,
        currentPage
      );
      console.log(response);
      setShowProgressbar(false);
      setPageIsLoading(false);
      const updatedArtworkData = (response?.artworkData || []).map((artwork) => {
        if (artwork.liked) {
          artwork.isFavorited = true;
        }
        return artwork;
      });
      setArtworkData(updatedArtworkData);
      setTotalRecords(response?.totalPages || 0);
    };

    fetchArtworks();
  }, [filterQuery, currentPage]);

  useEffect(() => {
    setShowProgressbar(isLoading);
    setCurrentPage(1);
    setTotalRecords(totalPages);
    const updatedArtworkData = searchedArtworks.map((artwork) => {
      if (artwork.liked) {
        artwork.isFavorited = true;
      }
      return artwork;
    });
    setArtworkData(updatedArtworkData);

    return () => {
      saveArtworkIds(savedArtworkIds);
    };
  }, [isLoading, searchedArtworks, totalPages]);

  const [saveArtwork] = useMutation(SAVE_ARTWORK);

  const handleSaveArtwork = async (artworkId) => {
    const artworkToSave = searchedArtworks.find(
      (artwork) => artwork.artworkId === artworkId
    );

    const token = Auth.loggedIn() ? Auth.getToken() : null;

    if (!token) {
      return false;
    }

    try {
      const response = await saveArtwork({
        variables: {
          input: artworkToSave,
        },
      });

      if (!response) {
        throw new Error("something went wrong!");
      }

      setSavedArtworkIds([...savedArtworkIds, artworkToSave.artworkId]);
    } catch (err) {
      console.error(err);
    }
  };

  const handlePageChange = (pageNumber) => {
    setShowProgressbar(true);
    setCurrentPage(pageNumber);
    getPaginatedArtworks(pageNumber).then((data) => {
      const updatedArtworkData = data.map((artwork) => {
        if (artwork.liked) {
          artwork.isFavorited = true;
        }
        return artwork;
      });
      setArtworkData(updatedArtworkData);
      setShowProgressbar(false);
    });
  };

  const getPaginatedArtworks = async (pageNumber) => {
    const response = await getRecords(
      localStorage.getItem("currentQuery"),
      localStorage.getItem("currentFilter"),
      pageNumber
    );
    const updatedArtworkData = (response?.artworkData || []).map((artwork) => {
      if (artwork.liked) {
        artwork.isFavorited = true;
      }
      return artwork;
    });
    setTotalRecords(response?.totalPages || 0);
    setArtworkData(updatedArtworkData);
    return response?.artworkData || [];
  };

  const handleCardClick = (artwork, event) => {
    if (isAddModalOpen) {
      return;
    }

    let currentElement = event.target;
    let isInsideDataAndButtonsWrapper = false;
    while (currentElement) {
      if (
        currentElement.classList.contains("data-and-buttons-wrapper") ||
        currentElement.classList.contains("MuiSvgIcon-root") ||
        currentElement.classList.contains("bullet-pad-left") ||
        currentElement.classList.contains("bullet")
      ) {
        isInsideDataAndButtonsWrapper = true;
        break;
      }
      currentElement = currentElement.parentElement;
    }
    if (isInsideDataAndButtonsWrapper) {
      return;
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
      link = "https://en.wikipedia.org/wiki/" + encodeURIComponent(artwork.title);
    } else {
      link = "https://www.europeana.eu/en/item" + artwork.artworkId;
    }
    window.open(link, "_blank");
  };

  const handleFavoriteClick = async (artwork) => {
    if (!localStorage.getItem("loggedInUser")) {
      window.location.href = "/LoginForm";
      return;
    }
    if (localStorage.getItem("loggedInUser")) {
      if (!artwork.isFavorited) {
        await saveLikedArtworkIntoDataBase(artwork);
      } else {
        await deleteLikedArtworkFromDataBase(artwork.artworkId);
      }
    }

    let artworkId = artwork.artworkId;
    setArtworkData((prevArtworkData) =>
      prevArtworkData.map((artwork) =>
        artwork.artworkId === artworkId
          ? {
            ...artwork,
            isFavorited: !artwork.isFavorited,
            liked: !artwork.liked,
          }
          : artwork
      )
    );
  };

  const CardLogo = ({ src, alt = "Logo", style = {} }) => {
    return (
      <img
        src={src}
        alt={alt}
        style={{
          width: "2.5rem",
          height: "2.5rem",
          ...style,
        }}
      />
    );
  };

  // Clustering based on provided labels
  const clusterArtworksByLabels = (artworks) => {
    const clustersMap = new Map();
    artworks.forEach((artwork) => {
      const label =
        artwork.clusterLabel !== undefined ? artwork.clusterLabel : "Unknown";
      if (!clustersMap.has(label)) {
        clustersMap.set(label, []);
      }
      clustersMap.get(label).push(artwork);
    });

    const clusters = Array.from(clustersMap.entries()).map(([label, artworks]) => {
      const keywordFreq = {};
      artworks.forEach((artwork) => {
        (artwork.keywords || []).forEach((keyword) => {
          keywordFreq[keyword] = (keywordFreq[keyword] || 0) + 1;
        });
      });
      let topKeyword = null;
      let maxCount = 0;
      for (const [keyword, count] of Object.entries(keywordFreq)) {
        if (count > maxCount) {
          topKeyword = keyword;
          maxCount = count;
        }
      }
      const properName = topKeyword
        ? topKeyword.charAt(0).toUpperCase() + topKeyword.slice(1)
        : `${label}`;
      return {
        clusterLabel: properName,
        artworks: artworks,
      };
    });

    return clusters;
  };

  const ClustersView = forwardRef(
    ({ savedArtworks, setSavedArtworks, toggleAddModal, handleCardClick }, ref) => {
      useImperativeHandle(ref, () => ({
        handleDelete() {
          setArtworkData([]);
          localStorage.setItem("currentQuery", "");
          setCurrentPage(1);
          setShowProgressbar(true);
          getPaginatedArtworks(currentPage).then((data) => {
            setShowProgressbar(false);
            setArtworkData(data);
          });
        },
      }));

      useEffect(() => {
        console.log("ClustersView re-rendered due to savedArtworks change");
      }, [savedArtworks]);

      const clusters = clusterArtworksByLabels(artworkData);

      const useStyles = makeStyles({
        clusterContainer: {
          border: "1px solid #ccc",
          padding: "30px",
          marginBottom: "20px",
          display: "flex",
        },
        keywordList: {
          flex: "0 0 200px",
          marginRight: "20px",
        },
        artworkGrid: {
          flex: "1",
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
        cardImage: {
          width: "100%",
          height: "200px",
          objectFit: "cover",
        },
        card: {
          width: "100%",
        },
        mainKeywordTitle: {
          fontWeight: "bold",
          marginBottom: "15px",
        },
      });

      const classes = useStyles();

      return (
        <Container>
          {clusters.map((cluster, index) => {
            // For each cluster, group artworks by source (using license field)
            const europeanaItems = cluster.artworks.filter(
              (art) => art.license !== "EXLIB" && art.license !== "WIKI"
            );
            const exLibrisItems = cluster.artworks.filter(
              (art) => art.license === "EXLIB"
            );
            const wikipediaItems = cluster.artworks.filter(
              (art) => art.license === "WIKI"
            );
            // Merge using round-robin ordering
            const roundRobinItems = mergeDataRoundRobin(
              europeanaItems,
              exLibrisItems,
              wikipediaItems
            );

            return (
              <div key={index} className={classes.clusterContainer}>
                <div className={classes.keywordList}>
                  <h5 className={classes.mainKeywordTitle}>
                    {cluster.clusterLabel}
                  </h5>
                  {(cluster.artworks[0]?.keywords || []).slice(0, 5).map((keyword, idx) => (
                    <div key={idx} className={classes.keywordButton}>
                      {keyword}
                    </div>
                  ))}
                </div>
                <div className={classes.artworkGrid}>
                  <Row>
                    {roundRobinItems.map((artwork) => (
                      <Col xs={12} md={6} lg={4} xl={4} key={artwork.artworkId}>
                        <Card
                          className={`artwork-card ${classes.card}`}
                          style={{ marginBottom: "20px" }}
                        >
                          <div onClick={(event) => handleCardClick(artwork, event)}>
                            {artwork.image &&
                              artwork.image !== "No image available" ? (
                              <Card.Img
                                src={artwork.image}
                                alt={`The image for ${artwork.title}`}
                                className={classes.cardImage}
                              />
                            ) : (
                              <Card.Img
                                src="./url.png"
                                alt="Fallback"
                                className={classes.cardImage}
                              />
                            )}
                            <Card.Body>
                              <div style={{ display: "flex", alignItems: "center" }}>
                                <CardLogo
                                  src={
                                    artwork.license === "EXLIB"
                                      ? "./uofrLogo.png"
                                      : artwork.license === "WIKI"
                                        ? "./wikipedia.png"
                                        : "./europeana.png"
                                  }
                                  alt="Artwork Logo"
                                />
                                <Card.Subtitle style={{ marginLeft: "10px" }}>
                                  {artwork.dataProvider}
                                </Card.Subtitle>
                              </div>
                              <Card.Title>
                                {artwork.title == "null" ? "" : artwork.title}
                              </Card.Title>
                              <Card.Text>
                                {artwork.description != null &&
                                  artwork.description !== ""
                                  ? artwork.description.slice(0, 150) + "..."
                                  : ""}
                              </Card.Text>
                              <div className="data-and-buttons-wrapper d-flex">
                                <span
                                  className={`d-inline-flex align-items-center text-uppercase hover-effect ${savedArtworks[String(artwork.artworkId).toLowerCase()]
                                      ? "green-label"
                                      : ""
                                    }`}
                                  onClick={() => toggleAddModal(artwork, artwork.image)}
                                >
                                  <AddCircleIcon
                                    id={"saveIcon"}
                                    sx={{
                                      fontSize: ".875rem",
                                      color: savedArtworks[String(artwork.artworkId).toLowerCase()]
                                        ? "green"
                                        : "inherit",
                                    }}
                                  />
                                  <span className="license-label-text buttons-wrapper-icon">
                                    {savedArtworks[String(artwork.artworkId).toLowerCase()]
                                      ? "Saved"
                                      : "Save"}
                                  </span>
                                </span>
                              </div>
                            </Card.Body>
                          </div>
                        </Card>
                      </Col>
                    ))}
                  </Row>
                </div>
              </div>
            );
          })}
        </Container>
      );
    }
  );

  const Pagination = () => {
    const [inputValue, setInputValue] = useState(currentPage);

    const handleKeyPress = (e) => {
      if (e.key === "Enter" || e.keyCode === 13) {
        const page = Number(e.target.value);
        if (page >= 1 && page <= totalRecords / 24) {
          handlePageChange(page);
        }
      }
    };

    const handleInputChange = (e) => {
      setInputValue(e.target.value);
      e.preventDefault();
    };

    const nextPage = () => {
      if (currentPage < totalRecords / 24) {
        handlePageChange(inputValue + 1);
      }
    };

    const previousPage = () => {
      if (currentPage > 1) {
        handlePageChange(inputValue - 1);
      }
    };

    return (
      <div className="pagination-ep d-flex align-items-center">
        <button className="btn-page-nav mx-3" onClick={previousPage}>
          <FontAwesomeIcon icon={faArrowLeft} />
          &nbsp;PREVIOUS
        </button>

        <input
          type="number"
          className="form-control mx-3"
          min={1}
          max={totalRecords / 24}
          onKeyDown={handleKeyPress}
          value={inputValue}
          onChange={handleInputChange}
          style={{ width: "100px", textAlign: "center" }}
        />

        <span className="mx-3">
          OF{" "}
          {Math.floor(
            totalRecords / 24 < 1
              ? 1
              : totalRecords / 24 > 42
                ? 42
                : totalRecords / 24
          )}
        </span>
        <button className="btn-page-nav mx-3" onClick={nextPage}>
          NEXT&nbsp;
          <FontAwesomeIcon icon={faArrowRight} />
        </button>
      </div>
    );
  };

  const childRef = useRef();

  const toggleAddModal = async (artwork, image) => {
    if (!localStorage.getItem("loggedInUser")) {
      window.location.href = "/LoginForm";
      return;
    }
    if (localStorage.getItem("loggedInUser")) {
      setAddedArtworkToGallery(artwork);
      setAddedArtworkImageToGallery(image);
      setIsAddModalOpen(!isAddModalOpen);
      const response = await getGalleries();
      setUserGalleries(response.galleries);
    }
  };

  const handleGalleryNameChange = (e) => {
    setGalleryName(e.target.value);
  };
  const handleGalleryDescriptionChange = (e) => {
    setGalleryDescription(e.target.value);
  };
  const handleGalleryPublicChange = (e) => {
    setGalleryPrivate(e.target.checked);
  };

  const handleCreateGallerySubmit = async (event) => {
    event.preventDefault();
    if (!galleryName) return;
    try {
      await saveGalleryIntoDataBase(
        addedArtworkToGallery,
        galleryName,
        addedArtworkImageToGallery,
        galleryDescription,
        galleryPrivate
      );
    } catch (err) {
      console.error(err);
    }
    const response = await getGalleries();
    setUserGalleries(response.galleries);
    setGalleryName("");
    setGalleryDescription("");
    setGalleryPrivate(false);
    setIsAddModalChildOpen(!isAddModalChildOpen);
  };

  const useStylesCustom = makeStyles({
    customButton: {
      maxWidth: "750px",
      minHeight: "55px",
      minWidth: "550px",
      display: "flex",
      backgroundImage: (props) =>
        !props.isGalleryButtonSelected ? `url(${props.image})` : "none",
      justifyContent: "space-between",
      alignItems: "center",
      backgroundSize: "cover",
      backgroundPosition: "center",
      position: "relative",
      overflow: "hidden",
      color: "#000",
      fontSize: "1rem",
      fontWeight: "bold",
      cursor: "pointer",
      border: "none",
      padding: "16px",
      "&:focus": {
        outline: "none",
      },
    },
    selectedButton: {
      backgroundImage: "none",
      backgroundColor: "#4caf50",
      "&:hover": {
        backgroundColor: "#388e3c",
      },
    },
    checkboxIcon: {
      marginLeft: "8px",
    },
  });

  const GalleryButton = ({
    gallery,
    savedArtworks,
    setSavedArtworks,
    addedArtworkToGallery,
    setUserGalleries,
    userGalleries,
  }) => {
    const [isGalleryButtonSelected, setIsGalleryButtonSelected] = useState(false);
    const classesCustom = useStylesCustom({
      image: gallery.image,
      isGalleryButtonSelected,
    });

    useEffect(() => {
      const isArtworkInGallery = (gallery.artworks || []).some((artwork) => {
        const artworkId = String(artwork.artworkId).toLowerCase();
        const addedArtworkId = String(addedArtworkToGallery.artworkId).toLowerCase();
        return artworkId === addedArtworkId;
      });
      setIsGalleryButtonSelected(isArtworkInGallery);
    }, [gallery.artworks, addedArtworkToGallery]);

    const handleButtonClick = async () => {
      const artworkIdKey = String(addedArtworkToGallery.artworkId).toLowerCase();
      try {
        if (!isGalleryButtonSelected) {
          const artworkWithMeta = {
            ...addedArtworkToGallery,
            isNew: true,
            savedAt: new Date().toISOString(),
          };
          await saveGalleryIntoDataBase(
            artworkWithMeta,
            gallery.gallery,
            gallery.image,
            gallery.galleryDescription,
            gallery.isPrivate
          );
          const updatedUserGalleries = userGalleries.map((g) => {
            if (g._id === gallery._id) {
              return {
                ...g,
                artworks: [...(g.artworks || []), artworkWithMeta],
              };
            }
            return g;
          });
          setUserGalleries(updatedUserGalleries);
          const updatedSavedArtworks = { ...savedArtworks };
          updatedSavedArtworks[artworkIdKey] = true;
          setSavedArtworks(updatedSavedArtworks);
          localStorage.setItem("savedArtworks", JSON.stringify(updatedSavedArtworks));
          setIsGalleryButtonSelected(true);
        } else {
          await deleteArtworkFromGallery(addedArtworkToGallery.artworkId, gallery._id);
          const updatedUserGalleries = userGalleries.map((g) => {
            if (g._id === gallery._id) {
              return {
                ...g,
                artworks: (g.artworks || []).filter((artwork) => {
                  const artworkId = String(artwork.artworkId).toLowerCase();
                  return artworkId !== artworkIdKey;
                }),
              };
            }
            return g;
          });
          setUserGalleries(updatedUserGalleries);
          let isStillSaved = false;
          for (const gal of updatedUserGalleries) {
            if (
              (gal.artworks || []).some((art) => {
                const artworkId = String(art.artworkId).toLowerCase();
                return artworkId === artworkIdKey;
              })
            ) {
              isStillSaved = true;
              break;
            }
          }
          if (!isStillSaved) {
            const newSavedArtworks = { ...savedArtworks };
            delete newSavedArtworks[artworkIdKey];
            setSavedArtworks(newSavedArtworks);
            localStorage.setItem("savedArtworks", JSON.stringify(newSavedArtworks));
          }
          setIsGalleryButtonSelected(false);
        }
      } catch (err) {
        console.error("Error in handleButtonClick:", err);
        alert("An error occurred while updating the gallery. Please try again.");
      }
    };

    return (
      <Grid item xs={8}>
        <Button
          className={`${classesCustom.customButton} ${isGalleryButtonSelected ? classesCustom.selectedButton : ""
            }`}
          fullWidth
          onClick={handleButtonClick}
        >
          <span>
            {gallery.gallery +
              " (" +
              (!gallery.isPrivate ? "public" : "private") +
              ") - " +
              ((gallery.artworks || []).length + " items")}
          </span>
          {isGalleryButtonSelected && <CheckCircleIcon className={classesCustom.checkboxIcon} />}
        </Button>
      </Grid>
    );
  };

  return (
    <>
      {localStorage.getItem("firstRun") != null &&
        localStorage.getItem("firstRun") !== "true" ? (
        <Container fluid className="search-container">
          <Row>
            <Col xs={12} sm={12}>
              <Row>
                <Col xs={12} sm={10}>
                  <h5 className="padtop context-label">
                    {totalRecords > 5
                      ? `${totalRecords.toLocaleString()} RESULTS `
                      : ""}
                    {localStorage.getItem("currentQuery") ? (
                      <>
                        <span>FOR</span>
                        <StyledChip
                          style={{
                            backgroundColor: "#daeaf8",
                            color: "#4d4d4d",
                            margin: "6px",
                            borderRadius: "2.25rem",
                          }}
                          label={localStorage.getItem("currentQuery")}
                          onDelete={() => {
                            childRef.current.handleDelete();
                            onChipDelete && onChipDelete();
                          }}
                        />
                      </>
                    ) : (
                      <div></div>
                    )}
                  </h5>
                </Col>
                <Col xs={12} sm={2}></Col>
              </Row>
              <div className={"card-container"}>
                <ClustersView
                  ref={childRef}
                  savedArtworks={savedArtworks}
                  setSavedArtworks={setSavedArtworks}
                  toggleAddModal={toggleAddModal}
                  handleCardClick={handleCardClick}
                />
              </div>
              <Dialog
                sx={{ top: "-40%", "& .MuiBackdrop-root": { opacity: "0.9" } }}
                open={isAddModalOpen}
                TransitionComponent={Transition}
                keepMounted
                onClose={() => setIsAddModalOpen(!isAddModalOpen)}
                aria-describedby="alert-dialog-slide-description"
              >
                <DialogTitle>{"Add to gallery"}</DialogTitle>
                <DialogContent>
                  <DialogContentText id="alert-dialog-slide-description">
                    <Button
                      className={"gallery-create-btn"}
                      style={{
                        maxWidth: "750px",
                        minHeight: "55px",
                        minWidth: "550px",
                        display: "flex",
                        justifyContent: "left",
                        alignItems: "center",
                        marginBottom: "20px",
                        color: "#000",
                      }}
                      fullWidth={true}
                      onClick={(event) => {
                        event.preventDefault();
                        setIsAddModalChildOpen(!isAddModalChildOpen);
                      }}
                    >
                      CREATE NEW GALLERY
                    </Button>
                    <Grid container spacing={2}>
                      {userGalleries.map((gallery) => (
                        <GalleryButton
                          key={gallery._id}
                          className={"gallery-add-btn"}
                          gallery={gallery}
                          savedArtworks={savedArtworks}
                          setSavedArtworks={setSavedArtworks}
                          addedArtworkToGallery={addedArtworkToGallery}
                          setUserGalleries={setUserGalleries}
                          userGalleries={userGalleries}
                        />
                      ))}
                    </Grid>
                  </DialogContentText>
                </DialogContent>
                <Button
                  style={{
                    border: "2px solid black",
                    backgroundColor: "white",
                    cursor: "pointer",
                    borderColor: "#2196F3",
                    color: "dodgerblue",
                    maxWidth: "75px",
                    minWidth: "55px",
                    marginLeft: "25px",
                    marginTop: "25px",
                    marginBottom: "30px",
                  }}
                  variant="outlined"
                  onClick={() => setIsAddModalOpen(!isAddModalOpen)}
                >
                  Close
                </Button>
              </Dialog>

              <Dialog
                sx={{ top: "-5%", "& .MuiBackdrop-root": { opacity: "0.9" } }}
                open={isAddModalChildOpen}
                keepMounted
                onClose={() => setIsAddModalChildOpen(!isAddModalChildOpen)}
                aria-describedby="alert-dialog-slide-description"
              >
                <DialogTitle>{"Create gallery"}</DialogTitle>
                <DialogContent>
                  <DialogContentText id="alert-dialog-slide-description">
                    <form onSubmit={handleCreateGallerySubmit}>
                      <label> Gallery name</label>
                      <TextField
                        required
                        label=""
                        variant="outlined"
                        value={galleryName}
                        onChange={handleGalleryNameChange}
                        style={{
                          maxWidth: "750px",
                          minWidth: "550px",
                          marginBottom: "0",
                        }}
                        fullWidth={true}
                      />
                      <label style={{ fontSize: ".75rem" }}> Required field</label>
                      <br />
                      <br />
                      <label> Gallery description</label>
                      <TextField
                        multiline
                        rows={4}
                        label=""
                        variant="outlined"
                        value={galleryDescription}
                        onChange={handleGalleryDescriptionChange}
                        fullWidth={true}
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
                        CANCEL
                      </Button>
                    </Grid>
                    <Grid item xs={3}></Grid>
                    <Grid item xs={2}></Grid>
                    <Grid item xs={4}>
                      <Button style={{}} onClick={handleCreateGallerySubmit}>
                        CREATE GALLERY
                      </Button>
                    </Grid>
                  </Grid>
                </DialogActions>
              </Dialog>
              {!pageIsLoading && totalRecords > 1 && (
                <div className="d-flex justify-content-center">
                  <Pagination />
                </div>
              )}
            </Col>
          </Row>
        </Container>
      ) : (
        <></>
      )}
    </>
  );
};

export default SearchArtworks;
