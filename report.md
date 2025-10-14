Ashley AI Unified – AI Instruction Prompt

Use this set of high‑level instructions to systematically address issues across the Ashley AI Unified repository.  Each section summarises problems identified in the codebase and provides concrete actions to fix them.  Paste these instructions into your AI pair‑programming environment to guide code repairs and enhancements.

API Routes (python‑service/api/routes)
	•	Replace deprecated arguments – In all model‑loading functions, replace use of the deprecated torch_dtype parameter with the correct dtype argument (e.g., dtype=torch.float16).  Update call sites and factory functions accordingly.
	•	Validate outputs – Wrap all route responses in Pydantic models rather than returning raw dictionaries.  Define schemas (e.g., ModelListResponse, ModelSwitchResponse) and validate that required keys (response, persona_used, sources) exist.
	•	Improve error handling – Avoid leaking internal exception strings.  Catch exceptions, log them, and return structured JSON errors via HTTPException with meaningful messages and appropriate status codes.
	•	Avoid shared state mutations – Do not mutate global configuration objects (e.g., internet_manager.config) in request handlers.  Clone or copy the configuration per request to ensure thread safety.
	•	Asynchronous operations – Long‑running tasks (model inference, internet searches) should run in background threads or async tasks (asyncio.to_thread, BackgroundTasks) to prevent blocking the event loop.  Consider using streaming responses for chat endpoints.
	•	Limit health disclosure – Reduce the amount of sensitive data exposed by health checks in production (e.g., omit device names, cache sizes).  Provide a high‑level status instead.

App Layer (python‑service/app)
	•	Cache configuration – Make get_settings() return a cached Settings instance (e.g., using functools.lru_cache()) instead of recreating it on each call.  Use Pydantic’s BaseSettings to validate environment variables and require critical keys.
	•	Centralise logging – Consolidate logging setup into a single module and remove duplicate logging.basicConfig calls throughout the codebase.
	•	Moderation enhancements – Use an Enum for moderation actions (block, allow, flag) to enforce valid values.  Validate that all required API keys are present; raise descriptive configuration errors otherwise.
	•	Routing context immutability – Make RoutingContext immutable; avoid storing mutable session state inside it.  Pass routing parameters explicitly when selecting a model.  Move heuristics into configuration so they can be adjusted without code changes.
	•	State isolation and persistence – Ensure that ChatState and memory stores are not shared across threads.  Introduce locks or per‑session isolation.  Persist token usage, memory entries and session data to a database (e.g., SQLite, Redis) so state survives restarts.
	•	Externalise personas – Move persona definitions from Python code into JSON or YAML files in a personas directory.  Implement dynamic loading and an API to add/update personas at runtime.
	•	Refactor ChatOrchestrator – Decompose the monolithic orchestrator into smaller components (e.g., message history manager, moderation handler, tool context builder).  Run expensive tasks (code execution, internet searches) asynchronously or in background workers.
	•	Memory management – Implement eviction policies (LRU or time‑based) for long‑term memory.  Persist long‑term memory to a durable store.  Filter tool outputs to mitigate prompt injection before including them in prompts.

Core (python‑service/core)
	•	Async chat engine – Refactor enhanced_chat_engine.generate_response to be asynchronous.  Use asyncio.to_thread() for blocking model inference calls and httpx.AsyncClient for HTTP requests.  Deduplicate and validate returned source URLs.
	•	Persona caching – Cache persona bundles in memory after the first load and invalidate the cache when personas are updated to avoid repeated file I/O.
	•	Model management – Provide explicit unload_model() and reload_model() methods in pytorch_manager.py to free GPU/CPU memory when models are no longer needed.  Use huggingface_hub functions (e.g., hf_hub_download) with caching and resumable downloads.  Detect available hardware (torch.cuda.is_available()) and support device_map="auto" for automatic placement.
	•	Fine‑tuning and LoRA – Either implement real fine‑tuning logic or remove stub functions.  Validate LoRA configuration inputs and raise clear errors when unsupported models are requested.  Build prompts from multi‑message histories with explicit role markers (e.g., system, user, assistant) to improve context handling.
	•	Improved memory store – Integrate a vector store (FAISS or pgvector) for semantic search in the memory store.  Provide pagination and deduplicate search results.  Replace file‑based session logs with a thread‑safe database and implement cleanup of expired sessions.  Persist usage metrics in a database to avoid data loss.

Front‑End API (src/app/api)
	•	Proxy helper – Create a reusable proxyRequest() helper that reads request JSON, forwards it to the Python service, sets appropriate headers, handles streaming, and unifies error handling.  Use this helper across all Next.js API routes.
	•	Environment configuration – Store the Python microservice base URL in an environment variable (PYTHON_SERVICE_URL) defined in .env files.  Avoid hard‑coding http://127.0.0.1:8001 throughout the codebase.
	•	Standardised fetch options – Use consistent fetch options (e.g., cache: 'no‑store', streaming support) for all API calls.  Implement streaming proxies for chat endpoints to preserve real‑time responses.
	•	Reusability and validation – Refactor duplicated form components (login/register) into shared components.  Add client‑side validation (e.g., via React Hook Form or Zod) and display specific error messages.
	•	State and session management – Persist selected persona and chat history in a state store (Redux or Zustand) and implement secure authentication using HttpOnly cookies (NextAuth or JWT).  Set secure and sameSite flags on cookies.
	•	Accessibility – Ensure buttons and form fields have proper aria labels and support keyboard navigation.  Use semantic HTML.

Components and Utilities (src/components, src/utils)
	•	Component reuse – Abstract recurring UI patterns (chat bubbles, persona selectors) into shared components to reduce duplication and maintain consistency.
	•	Type safety – Replace usage of any with defined TypeScript interfaces and types.  Document function parameters and return types.
	•	Error boundaries – Add React error boundaries around high‑level routes or layouts to gracefully handle unexpected errors and show a friendly fallback UI.
	•	Dark mode – Ensure all components respect light/dark theme variables.  Centralise colours into CSS variables or Tailwind configuration for easier theme switching.

Styling and Assets
	•	CSS encapsulation – Migrate global CSS to Tailwind CSS or CSS Modules for better encapsulation and maintainability.  Remove unused styles.
	•	Image optimisation – Compress large image assets and serve them via Next.js’s next/image component for automatic optimisation and responsive sizing.

Testing and Continuous Integration
	•	Unit tests – Write unit tests for Python modules (e.g., orchestrator, moderation, internet manager) using pytest and for React components using React Testing Library and Jest.  Cover edge cases and error scenarios.
	•	CI pipeline – Configure GitHub Actions (or another CI platform) to run tests, lint the codebase (flake8, black, eslint, prettier), and perform security checks (bandit, npm audit) on each pull request.
	•	Dependency management – Pin package versions in requirements.txt and maintain them via Dependabot or Renovate.  Use pip‑tools or Poetry for reproducible dependency resolution.

Security
	•	Authentication – Implement a secure authentication system using hashed and salted passwords (bcrypt or Argon2) and token‑based sessions.  Remove plaintext storage of user credentials in JSON files.
	•	Sandboxed code execution – Restrict the code_executor.py to run untrusted code in a containerised environment with limited permissions and no network/file‑system access.  Enforce timeouts.
	•	Secrets management – Load API keys and tokens from a secrets manager (e.g., AWS Secrets Manager, HashiCorp Vault) and support key rotation.
	•	Prompt injection mitigation – Sanitise user input and tool outputs before passing them to the model.  Enforce separation of system, user and assistant roles to reduce injection risks.

Performance and Scalability
	•	Model preloading – Pre‑load frequently used models during service startup and share them across sessions.  Apply quantisation (int8/FP16) to reduce memory footprint.
	•	Concurrent execution – Use a multi‑worker setup (e.g., Gunicorn with Uvicorn workers) behind a reverse proxy to handle more concurrent requests.  Scale horizontally using container orchestration (Docker Compose, Kubernetes).
	•	Caching – Cache results of internet queries and chat responses using a distributed cache (e.g., Redis).  Implement TTLs and invalidation strategies.
	•	Distributed state – Move session and memory storage from local files to a distributed system (Redis or Memcached) when running multiple service instances.

Documentation
	•	Configuration docs – Document all environment variables (e.g., PYTHON_SERVICE_URL, HUGGINGFACE_TOKEN, OPENAI_API_KEY) with their purposes and default values.  Provide setup instructions for development and production.
	•	API docs – Use FastAPI’s OpenAPI generation and Next.js JSDoc comments to produce comprehensive API documentation, including request/response examples.
	•	Persona management docs – Document persona structure and provide guidelines for creating and updating persona files.
	•	Contribution guidelines – Add a CONTRIBUTING.md explaining how to set up the development environment, run tests, format code and submit pull requests.

Summary

Following these instructions will help you systematically address the technical debt, security vulnerabilities and architectural issues in the Ashley AI unified repository.  The result will be a more secure, maintainable, performant and scalable AI assistant platform.