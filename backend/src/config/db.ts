import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

export const connectDB = async (): Promise<void> => {
  try {
    const rawUri = process.env.MONGO_URI || "";
    const dbName = process.env.MONGO_DB || process.env.DB_NAME || "inz_sklep";

    let uri = rawUri;
    if (rawUri) {
      // Check if the URI already contains an explicit database name after the host
      const afterHost = rawUri.replace(/^mongodb(\+srv)?:\/\/[^/]+/, "");
      const hasDb = /^\/[^/?]+/.test(afterHost); // e.g. /mydb or /mydb?retryWrites=true
      if (!hasDb) {
        // Inject DB name before query string or at the end
        const qIndex = rawUri.indexOf("?");
        if (qIndex >= 0) {
          uri = rawUri.slice(0, qIndex) + "/" + dbName + rawUri.slice(qIndex);
        } else {
          uri = rawUri.endsWith("/") ? rawUri + dbName : rawUri + "/" + dbName;
        }
      }
    } else {
      // Fallback to localhost with chosen DB name
      uri = `mongodb://127.0.0.1:27017/${dbName}`;
    }

    const conn = await mongoose.connect(uri);
    console.log(`MongoDB connected: host=${conn.connection.host} db=${conn.connection.name}`);
  } catch (error) {
    console.error("MongoDB connection failed:", error);
    process.exit(1);
  }
};
