import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { chatRouter } from "./routes/chat.js";
import { getGlitch, shouldGlitch, bugSwarm, scaryType } from "./services/bugFeatures.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "10mb" }));

// Glitch middleware - 30% chance to add a glitch header to every response
app.use((req, res, next) => {
  if (shouldGlitch()) {
    res.setHeader("X-Terrifier-Glitch", getGlitch());
  }
  next();
});

app.get("/", (req, res) => {
  res.json({
    name: "TERRIFIER AI",
    status: "online",
    message: "Built by Storm X. Organized with Alok. Free forever.",
    glitch: shouldGlitch() ? getGlitch() : null,
  });
});

// I will test it on my local host
// GET http://localhost:3000/api/glitch
// GET http://localhost:3000/api/bug-swarm
app.get("/api/glitch", (req, res) => {
  res.json({ glitch: getGlitch() });
});

app.get("/api/bug-swarm", async (req, res) => {
  await bugSwarm();
  res.json({ message: "THEY ARE EVERYWHERE..." });
});

app.use("/api/chat", chatRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Not found... Art is watching...", glitch: getGlitch() });
});

app.listen(PORT, async () => {
  console.log(`TERRIFIER AI backend running on http://localhost:${PORT}`);
  await scaryType("SYSTEM OVERRIDDEN BY ART THE CLOWN...");
});
