import { connectDB } from "./config/db";
import dotenv from "dotenv";

dotenv.config();

const start = async () => {
  await connectDB();
  console.log("Backend uruchomiony!");
};

start();
