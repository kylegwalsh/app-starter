/** Hard ceiling for API requests before they timeout */
export const API_MAX_TIMEOUT_MS = 5 * 60 * 1000;

/** Soft ceiling just under the hard one, leaving room to log and respond before AWS kills the Lambda */
export const API_SOFT_TIMEOUT_MS = API_MAX_TIMEOUT_MS - 5000;
