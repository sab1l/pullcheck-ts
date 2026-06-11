// Responsibility: custom error classes for domain and integrity violations.
//
// Custom error classes vs plain Error:
//   Pros:
//     - instanceof checks in tests and CI handlers distinguish error types
//       without string-matching the message (e.g. catch (e) { if (e instanceof BusinessRuleError) })
//     - error.name is set explicitly and appears in CI logs and stack traces
//     - IntegrityError and BusinessRuleError signal different failure categories
//       to callers that want to handle them differently
//   Cons:
//     - instanceof can be unreliable when code crosses module boundaries in
//       some bundlers (e.g. two copies of the module in memory)
//     - adds a small amount of boilerplate for a project of this size
//   Decision: use custom classes — the instanceof benefit in tests and the
//     clearer CI output justify the small cost here.

/**
 * Thrown when a structural count or consistency check fails.
 * Example: total_open_prs does not match pull_requests.length.
 */
export class IntegrityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'IntegrityError';
  }
}

/**
 * Thrown when a business rule is violated.
 * Example: a PR carries both "high-priority" label and is_draft=true.
 */
export class BusinessRuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BusinessRuleError';
  }
}
