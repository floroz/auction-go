/**
 * Common shared types used across browser and server
 */

/**
 * Generic API error response
 */
export interface ApiError {
  message: string;
  code?: string;
  details?: Record<string, unknown>;
}

/**
 * Generic success response wrapper
 */
export interface ApiSuccess<T = void> {
  success: true;
  data: T;
}

/**
 * Generic error response wrapper
 */
export interface ApiErrorResponse {
  success: false;
  error: ApiError;
}

/**
 * Union type for API responses
 */
export type ApiResponse<T = void> = ApiSuccess<T> | ApiErrorResponse;
