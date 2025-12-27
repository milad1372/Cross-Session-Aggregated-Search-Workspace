// connection.js
const { MongoClient } = require("mongodb");
const Db = "mongodb+srv://dhaadmin...";
const client = new MongoClient(Db, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

let _db;

module.exports = {
  connectToServer: async function () {
    try {
      console.log("Attempting to connect to the database...");
      await client.connect();
      _db = client.db("dhaDB");
      console.log("Database connection established successfully.");
    } catch (err) {
      console.error("Error during MongoDB connection:", err);
      throw err; // Propagate the error to be handled in server.js
    }
  },

  getDb: function () {
    console.log("getDb called. Database initialized:", Boolean(_db));
    if (!_db) {
      throw new Error("Database has not been initialized. Call connectToServer first.");
    }
    return _db;
  },
};
