import { readFile, writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../data');
const STATE_FILE = path.join(DATA_DIR, 'app-state.json');

const defaultState = {
  emailsLog: [],
  notes: {},
  automations: [],
  apiKeys: { elevenlabs: '' },
};

async function ensureDataDir() {
  try {
    await mkdir(DATA_DIR, { recursive: true });
  } catch (_) {}
}

export async function loadState() {
  try {
    const raw = await readFile(STATE_FILE, 'utf-8');
    return { ...defaultState, ...JSON.parse(raw) };
  } catch {
    return { ...defaultState };
  }
}

let state = await loadState();

async function saveState() {
  await ensureDataDir();
  await writeFile(STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
}

export function getState() {
  return state;
}

export async function appendEmailLog(entry) {
  state.emailsLog.unshift({ ...entry, id: Date.now().toString(36) + Math.random().toString(36).slice(2), at: new Date().toISOString() });
  if (state.emailsLog.length > 500) state.emailsLog = state.emailsLog.slice(0, 500);
  await saveState();
  return state.emailsLog[0];
}

export async function getNotes(invoiceId) {
  return state.notes[String(invoiceId)] || [];
}

export async function addNote(invoiceId, note) {
  const id = String(invoiceId);
  if (!state.notes[id]) state.notes[id] = [];
  const entry = { id: Date.now().toString(36), body: note.body || note, fromClient: !!note.fromClient, at: new Date().toISOString() };
  state.notes[id].unshift(entry);
  await saveState();
  return entry;
}

export function getAutomations() {
  return [...state.automations];
}

export async function addAutomation(automation) {
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2);
  const nextRun = automation.type === 'burst' ? new Date(Date.now() + (automation.intervalHours || 1) * 60 * 60 * 1000).toISOString() : new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
  const entry = {
    id,
    invoiceId: String(automation.invoiceId),
    type: automation.type,
    lastRun: null,
    nextRun,
    count: 0,
    intervalDays: automation.intervalDays ?? 2,
    burstTotal: automation.burstTotal ?? 10,
    intervalHours: automation.intervalHours ?? 1,
    enabled: true,
    createdAt: new Date().toISOString(),
  };
  state.automations.push(entry);
  await saveState();
  return entry;
}

export async function updateAutomation(id, updates) {
  const i = state.automations.findIndex((a) => a.id === id);
  if (i === -1) return null;
  state.automations[i] = { ...state.automations[i], ...updates };
  await saveState();
  return state.automations[i];
}

export async function deleteAutomation(id) {
  state.automations = state.automations.filter((a) => a.id !== id);
  await saveState();
  return true;
}

export function getElevenLabsConfigured() {
  const key = state.apiKeys?.elevenlabs?.trim();
  return !!key;
}

export function getElevenLabsKey() {
  return state.apiKeys?.elevenlabs?.trim() || null;
}

export async function setElevenLabsKey(apiKey) {
  if (!state.apiKeys) state.apiKeys = { elevenlabs: '' };
  state.apiKeys.elevenlabs = typeof apiKey === 'string' ? apiKey.trim() : '';
  await saveState();
  return true;
}
