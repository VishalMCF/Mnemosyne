# AI

Server-side Codex headless adapter, prompt versions, and Zod-validated extraction and answer evaluation contracts. Uses `codex exec` with the existing ChatGPT login, `gpt-5.6-sol`, and medium reasoning effort. No API key or direct API client is used.

Each call runs in a temporary directory, passes quoted input over stdin, requests schema-constrained JSON, and validates the final output before returning it. User configuration is ignored while existing Codex authentication is reused. Runs are ephemeral with read-only sandboxing, automatic approvals disabled, web search disabled, and shell, app, plugin, browser, image, and delegation features disabled. Temporary schema/output files are removed on success and failure. A three-minute timeout bounds each call; failed extraction remains retryable.
