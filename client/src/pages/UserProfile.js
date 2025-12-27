import React, { useEffect, useState } from "react";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import Tab from "@mui/material/Tab";
import TabContext from "@mui/lab/TabContext";
import TabList from "@mui/lab/TabList";
import TabPanel from "@mui/lab/TabPanel";
import CircularProgress from "@mui/material/CircularProgress";
import { Card, Container } from "react-bootstrap";
import { useHistory } from "react-router-dom";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import TextField from "@mui/material/TextField";
import FormControlLabel from "@mui/material/FormControlLabel";
import Checkbox from "@mui/material/Checkbox";
import DialogActions from "@mui/material/DialogActions";
import saveGalleryIntoDataBase from "../api/saveGalleryApi";
import Slide from "@mui/material/Slide";
import getGalleries from "../api/getGalleriesApi";
import getUserLikedArtworks from "../api/getUserLikedArtworksApi";
import makeStyles from "@mui/styles/makeStyles";

const useStyles = makeStyles(() => ({
  // Gallery card styling (similar to Gallery.js artwork cards)
  cardContainer: {
    margin: "15px",
    maxWidth: "350px",
    cursor: "pointer",
    boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
    borderRadius: "4px",
    overflow: "hidden",
  },
  cardImage: {
    height: "200px",
    objectFit: "cover",
    width: "100%",
  },
  cardBody: {
    padding: "10px",
  },
  topRow: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "0.9rem",
    fontWeight: "bold",
  },
  galleryTitle: {
    fontSize: "1rem",
    fontWeight: "bold",
    margin: "5px 0",
  },
  summarySnippet: {
    fontSize: "0.8rem",
    color: "#555",
    marginTop: "5px",
  },
  keywordSummary: {
    display: "inline-block",
    backgroundColor: "yellow",
    padding: "5px 8px",
    margin: "5px 5px 5px 0",
    borderRadius: "3px",
    cursor: "pointer",
    fontSize: "0.8rem",
  },
  createCard: {
    border: "2px dashed #ccc",
    backgroundColor: "#f9f9f9",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "275px",
    maxWidth: "350px",
    margin: "15px",
    cursor: "pointer",
  },
}));

// Helper: Count clusters by grouping artworks on their clusterLabel.
const countClusters = (artworks = []) => {
  const clusters = new Set();
  artworks.forEach((art) => {
    const label = art.clusterLabel || "Unknown";
    clusters.add(label);
  });
  return clusters.size;
};

// Helper: Return a snippet of the summary outline (first 100 characters).
const getSummarySnippet = (summary = "") => {
  if (!summary) return "";
  return summary.length > 100 ? summary.slice(0, 100) + "..." : summary;
};

// Helper: Return highlighted keywords as an array.
const getKeywordsSnippet = (artworks = []) => {
  const keywordsSet = new Set();
  artworks.forEach((art) => {
    (art.highlights || []).forEach((kw) => keywordsSet.add(kw));
  });
  return Array.from(keywordsSet);
};

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="down" ref={ref} {...props} />;
});

const UserProfile = () => {
  const classes = useStyles();
  const history = useHistory();
  const [tabValue, setTabValue] = useState("2"); // 1=Likes, 2=Public, 3=Private
  const [publicGalleries, setPublicGalleries] = useState([]);
  const [privateGalleries, setPrivateGalleries] = useState([]);
  const [likedArtworks, setLikedArtworks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isAddModalChildOpen, setIsAddModalChildOpen] = useState(false);
  const [galleryName, setGalleryName] = useState("");
  const [galleryDescription, setGalleryDescription] = useState("");
  const [galleryPrivate, setGalleryPrivate] = useState(false);
  const [userGalleries, setUserGalleries] = useState([]);

  // Fetch data based on tab value.
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      if (tabValue === "1") {
        const response = await getUserLikedArtworks();
        setLikedArtworks(
          response.likedArtworks.length !== 0 ? response.likedArtworks[0].artworks : []
        );
      } else if (tabValue === "2") {
        const response = await getGalleries();
        const galleries = response.galleries.filter((gal) => !gal.isPrivate);
        galleries.reverse(); // newest first
        // Optionally, process timeline data and keywords if needed.
        setPublicGalleries(galleries);
      } else if (tabValue === "3") {
        const response = await getGalleries();
        const galleries = response.galleries.filter((gal) => gal.isPrivate);
        galleries.reverse();
        setPrivateGalleries(galleries);
      }
      setLoading(false);
    };
    fetchData();
  }, [tabValue]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // Navigate to gallery detail page
  const handleGalleryClick = (gallery) => {
    history.push("/Gallery", { galleryData: gallery });
  };

  // Render a gallery card (matching the structure and size of artwork cards in Gallery.js)
  const renderGalleryCard = (gallery) => {
    const artworkCount = gallery.artworks ? gallery.artworks.length : 0;
    const clusterCount = countClusters(gallery.artworks);
    const summarySnippet = getSummarySnippet(gallery.summaryOutline);
    const keywords = getKeywordsSnippet(gallery.artworks);
    return (
      <Card
        key={gallery._id}
        className={classes.cardContainer}
        onClick={() => handleGalleryClick(gallery)}
      >
        {gallery.image && gallery.image !== "No image available" ? (
          <Card.Img variant="top" src={gallery.image} className={classes.cardImage} />
        ) : (
          <Card.Img variant="top" src="./url.png" className={classes.cardImage} />
        )}
        <Card.Body className={classes.cardBody}>
          <div className={classes.topRow}>
            <Typography variant="subtitle2">{artworkCount} items</Typography>
            <Typography variant="subtitle2">
              {clusterCount} {clusterCount > 1 ? "clusters" : "cluster"}
            </Typography>
          </div>
          <Typography className={classes.galleryTitle}>{gallery.gallery}</Typography>
          {gallery.summaryOutline && (
            <Typography className={classes.summarySnippet}>
              Summary: {summarySnippet}
            </Typography>
          )}
          {keywords.length > 0 && (
            <div style={{ marginTop: "5px" }}>
              {keywords.map((kw, idx) => (
                <span key={idx} className={classes.keywordSummary}>
                  {kw}
                </span>
              ))}
            </div>
          )}
        </Card.Body>
      </Card>
    );
  };

  // Render "Create New Gallery" card with same structure/size
  const renderCreateGalleryCard = () => (
    <Card
      key="createGal"
      className={classes.cardContainer}
      onClick={() => setIsAddModalChildOpen(true)}
    >
      <div className={classes.createCard}>
        <Typography variant="h6" color="textSecondary">
          Create New Gallery
        </Typography>
      </div>
    </Card>
  );

  // Handlers for new gallery dialog
  const handleGalleryNameChange = (e) => setGalleryName(e.target.value);
  const handleGalleryDescriptionChange = (e) => setGalleryDescription(e.target.value);
  const handleGalleryPublicChange = (e) => setGalleryPrivate(e.target.checked);
  const handleCreateGallerySubmit = async (event) => {
    event.preventDefault();
    if (!galleryName) return;
    try {
      await saveGalleryIntoDataBase("", galleryName, "", galleryDescription, galleryPrivate);
      const response = await getGalleries();
      if (tabValue === "2") {
        const galleries = response.galleries.filter((g) => !g.isPrivate);
        galleries.reverse();
        setPublicGalleries(galleries);
      } else if (tabValue === "3") {
        const galleries = response.galleries.filter((g) => g.isPrivate);
        galleries.reverse();
        setPrivateGalleries(galleries);
      }
    } catch (err) {
      console.error(err);
    }
    setGalleryName("");
    setGalleryDescription("");
    setGalleryPrivate(false);
    setIsAddModalChildOpen(false);
  };

  return (
    <Grid container spacing={2} justifyContent="center" alignItems="center" className="userProfile">
      <Grid item xs={12}>
        <Typography variant="h6" style={{ marginTop: "100px", textAlign: "center" }}>
          @{localStorage.getItem("loggedInUser")}
        </Typography>
      </Grid>
      <Grid item xs={12} container justifyContent="center">
        <Button
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
          onClick={() => {
            localStorage.setItem("loggedInUser", "");
            window.location.href = "/";
          }}
        >
          Log out
        </Button>
      </Grid>
      <Grid item xs={12}>
        <Box sx={{ width: "100%", typography: "body1", marginTop: "5px" }}>
          <TabContext value={tabValue}>
            <Box
              sx={{
                borderBottom: 1,
                borderColor: "divider",
                display: "flex",
                justifyContent: "center",
              }}
            >
              <TabList onChange={handleTabChange}>
                {/* <Tab label="Likes" value="1" /> */}
                <Tab label="Galleries" value="2" />
                {/* <Tab label="Private Galleries" value="3" /> */}
              </TabList>
            </Box>
            <TabPanel value="1">
              {loading ? (
                <CircularProgress size={20} />
              ) : (
                <Container className="card-container-grid mx-0 user-profile-grid">
                  {likedArtworks.map((art) => (
                    <Card
                      key={art.artworkId}
                      className={classes.cardContainer}
                      onClick={() =>
                        window.open("https://www.europeana.eu/en/item" + art.artworkId, "_blank")
                      }
                    >
                      {art.image && art.image !== "No image available" ? (
                        <Card.Img variant="top" src={art.image} className={classes.cardImage} />
                      ) : (
                        <Card.Img variant="top" src="./url.png" className={classes.cardImage} />
                      )}
                      <Card.Body className={classes.cardBody}>
                        <Typography className={classes.galleryTitle}>{art.title}</Typography>
                      </Card.Body>
                    </Card>
                  ))}
                </Container>
              )}
            </TabPanel>
            <TabPanel value="2">
              {loading ? (
                <CircularProgress size={20} />
              ) : (
                <Container
                  className="card-container-grid mx-0 user-profile-grid"
                  style={{ display: "flex", flexWrap: "wrap", justifyContent: "center" }}
                >
                  {publicGalleries.map((gallery) => renderGalleryCard(gallery))}
                  {renderCreateGalleryCard()}
                </Container>
              )}
            </TabPanel>
            <TabPanel value="3">
              {loading ? (
                <CircularProgress size={20} />
              ) : (
                <Container
                  className="card-container-grid mx-0 user-profile-grid"
                  style={{ display: "flex", flexWrap: "wrap", justifyContent: "center" }}
                >
                  {privateGalleries.map((gallery) => renderGalleryCard(gallery))}
                  {renderCreateGalleryCard()}
                </Container>
              )}
            </TabPanel>
          </TabContext>
        </Box>
      </Grid>

      {/* Dialog for creating a new gallery */}
      <Dialog
        open={isAddModalChildOpen}
        TransitionComponent={Transition}
        keepMounted
        onClose={() => setIsAddModalChildOpen(!isAddModalChildOpen)}
        aria-describedby="create-gallery-dialog"
      >
        <DialogTitle>{"Create Gallery"}</DialogTitle>
        <DialogContent>
          <DialogContentText id="create-gallery-dialog">
            <form onSubmit={handleCreateGallerySubmit}>
              <label>Gallery name</label>
              <TextField
                required
                variant="outlined"
                value={galleryName}
                onChange={handleGalleryNameChange}
                fullWidth
                style={{ maxWidth: "750px", minWidth: "550px", marginBottom: "0" }}
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
                control={<Checkbox checked={galleryPrivate} onChange={handleGalleryPublicChange} />}
                label="Keep this gallery private"
              />
            </form>
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Grid container spacing={2}>
            <Grid item xs={3}>
              <Button
                variant="outlined"
                onClick={() => setIsAddModalChildOpen(!isAddModalChildOpen)}
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
              >
                CANCEL
              </Button>
            </Grid>
            <Grid item xs={6}></Grid>
            <Grid item xs={3}>
              <Button
                variant="contained"
                onClick={handleCreateGallerySubmit}
                style={{ backgroundColor: "#0a72cc", fontSize: ".875rem" }}
              >
                CREATE GALLERY
              </Button>
            </Grid>
          </Grid>
        </DialogActions>
      </Dialog>
    </Grid>
  );
};

export default UserProfile;
