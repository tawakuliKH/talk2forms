import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { usersRouter } from "./routes/users.js";
import { trialRouter } from "./routes/trial";
import { formsRouter } from "./routes/forms";
import { authRouter } from "./routes/auth";


const app = express();

app.use(cookieParser());
app.use(
  cors({
    origin: process.env.CLIENT_URL || process.env.CLIENT_ORIGIN || "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json({ limit: "2mb" })); // 2mb to comfortably fit pasted CV text

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/api/users", usersRouter);
// ...
app.use("/api/trial", trialRouter);

// ...
app.use("/api/forms", formsRouter);
app.use("/api/auth", authRouter);
const port = Number(process.env.PORT) || 8787;
app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});

process.on("unhandledRejection", (reason) => {
  console.error("[server] Unhandled rejection (server stayed alive):", reason);
});
