// Keep the Supabase session cookie name stable across public and internal URLs.
// The browser uses the LAN URL while server-side clients use the Docker service
// URL; deriving the default name from each URL would make them use different
// cookies and prevent server-side session detection.
export const SUPABASE_AUTH_STORAGE_KEY = 'ndsast-auth-token'
