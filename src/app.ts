import express from "express";
import "./db";
import { router } from "./routes";
import { errorHandler } from "./middlewares/errorHandler";

export const app = express();

app.use(express.json());
app.use(router);
app.use(errorHandler);

const { PORT = "3000" } = process.env;

app.listen(Number(PORT), () => {
  console.log(`Factoring API listening on http://localhost:${PORT}`);
});
