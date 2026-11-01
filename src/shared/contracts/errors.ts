/** Error body returned by every WeighingMS and Dummy endpoint (coding-standards: Error Handling). */
export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}
