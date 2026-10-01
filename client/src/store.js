import { configureStore, createSlice } from '@reduxjs/toolkit';

const session = createSlice({
  name: 'session', initialState: { token: localStorage.getItem('dc-token'), user: null },
  reducers: {
    signedIn(state, action) { state.token = action.payload.token; state.user = action.payload.user; localStorage.setItem('dc-token', state.token); },
    setUser(state, action) { state.user = action.payload; },
    signedOut(state) { state.token = null; state.user = null; localStorage.removeItem('dc-token'); }
  }
});
export const { signedIn, setUser, signedOut } = session.actions;
export const store = configureStore({ reducer: { session: session.reducer } });

export async function api(path, { token, ...options } = {}) {
  const headers = { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  const response = await fetch(`/api${path}`, { ...options, headers });
  if (response.status === 204) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
}
export const json = body => JSON.stringify(body);
