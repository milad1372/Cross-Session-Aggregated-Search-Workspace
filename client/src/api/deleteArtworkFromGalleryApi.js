// deleteArtworkFromGallery.js

const AWS_Base_URL = "http://ec2-3-143-18-63.us-east-2.compute.amazonaws.com:3005/";
const Local_Base_URL = "http://localhost:3001/";
const mainURL = (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") ? Local_Base_URL : AWS_Base_URL;

const deleteArtworkFromGallery = async function (artworkId, galleryId) {
    try {
        let headers = new Headers();
        headers.append('Content-Type', 'application/json');
        headers.append('Accept', 'application/json');
        headers.append('Access-Control-Allow-Origin', '*');
        headers.append("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");

        const requestOptions = {
            method: 'POST', // Assuming your backend expects POST; otherwise, change to 'DELETE'
            headers: headers,
            body: JSON.stringify({
                artworkId: String(artworkId).toLowerCase(),
                galleryId: galleryId,
                user: localStorage.getItem('loggedInUser')
            })
        };

        const response = await fetch(mainURL + `deleteArtworkFromGallery`, requestOptions);

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Server error: ${response.statusText} - ${errorText}`);
        }

        const result = await response.json();
        return result;
    } catch (error) {
        console.error('Error in deleteArtworkFromGallery:', error);
        throw error;
    }
};

export default deleteArtworkFromGallery;
