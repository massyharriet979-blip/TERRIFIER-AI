import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { chatRouter } from "./routes/chat.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.get("/", (req, res) => {
  res.json({
    name: "TERRIFIER AI",
    status: "online",
    message: "Built by Storm X. Organized with Alok. Free forever."
  });
});

app.use("/api/chat", chatRouter);

app.listen(PORT, () => {
  console.log(`TERRIFIER AI backend running on http://localhost:${PORT}`);
});
