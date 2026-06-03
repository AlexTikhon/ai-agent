import cors from "cors";
import express from "express";
import { apiRouter } from "./routes";
import { errorMiddleware } from "./middleware/error";

export const app = express();

app.use(cors());
app.use(express.json({ limit: "5mb" }));
app.use("/api", apiRouter);
app.use(errorMiddleware);
