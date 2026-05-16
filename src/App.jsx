import { useState, useCallback, useEffect, useRef } from "react";
import {
  makeActiveGame,
  saveGame,
  loadGame,
  deleteGame,
  listSavedGames,
} from "./gameLogic";

const GAMES = [
  { id: "odin", label: "Odin" },
  { id: "flip7", label: "Flip7" },
  { id: "skyjo", label: "Skyjo" },
];

const BASE = {
  odin:  { limit: 100 },
  flip7: { limit: 200 },
  skyjo: { limit: 100 },
};