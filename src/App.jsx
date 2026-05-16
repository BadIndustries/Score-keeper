import { useState, useCallback, useEffect, useRef } from "react";
import { GAMES, COLORS, MEDALS, genId, DEFAULT_LIMITS, KEY_GROUPS } from './games.config.js';
import { loadData, saveGroups, saveActiveGame, loadGroups } from './storage.js';
import { makeActiveGame } from './gameLogic.js';