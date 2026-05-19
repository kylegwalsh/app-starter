/**
 * Ceiling for long-running functions (like agentic workflows). The shared
 * constant is also read by the soft-timeout middleware so the runtime can
 * throw a clean 504 just before AWS terminates the Lambda.
 *
 * Four things must all line up for this value to actually take effect:
 *   1. A `regional` REST API (see `infra/gateway.ts`).
 *   2. `timeout` set on the Lambda function (below).
 *   3. `timeoutMilliseconds` set on the route's integration (below).
 *   4. The AWS account quota "Maximum integration timeout in milliseconds"
 *      raised from the 29s default:
 *      https://us-east-1.console.aws.amazon.com/servicequotas/home/services/apigateway/quotas
 */
export const API_MAX_TIMEOUT_MINUTES = 5;

/** Milliseconds form of {@link API_MAX_TIMEOUT_MINUTES} */
export const API_MAX_TIMEOUT_MS = API_MAX_TIMEOUT_MINUTES * 60 * 1000;
