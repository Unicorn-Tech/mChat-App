const mongoose = require("mongoose");

async function connectToDb(uri) {
  if (!uri) throw new Error("DB_URI is required");

  mongoose.set("strictQuery", true); // 
  mongoose.connection.on("connected", () => { 
    console.log("MongoDB connected"); // check DB connection
  });
  mongoose.connection.on("disconnected", () => {
    console.log("MongoDB disconnected"); 
  });
  mongoose.connection.on("error", (err) => {
    console.error("MongoDB connection error:", err?.message ?? err);
  });

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10_000,
  });

  return mongoose.connection;
}

module.exports = { connectToDb };

