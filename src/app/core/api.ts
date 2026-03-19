import { isDevMode } from '@angular/core';

/** Base URL for all API calls.
 *  In dev: points directly to the Express server.
 *  In prod: empty string (same-origin, served together). */
export const API_BASE = isDevMode() ? 'http://localhost:3100' : '';
