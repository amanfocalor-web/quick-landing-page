# Cherub — independent AI system

Cherub is the AI assistant system inside Knot. Knot does not talk directly to a named model. It talks to Cherub's authenticated backend, and Cherub decides how a request should be handled.

## What Cherub owns

- Personalized assistant behavior and communication style
- User-scoped memory and recent conversation context
- Knot product knowledge
- Live-information retrieval for time-sensitive questions
- Safety and privacy policy
- Safe Knot navigation intents / app-tool protocol
- Per-request routing between fast, general, deep, live-research and Knot-tool paths
- The AI-engine boundary

The underlying model is an implementation detail. Ollama and the OpenAI API are not required by this backend.

## Routing

Cherub's router looks at the user's request and selects a path:

```text
fast            → short everyday conversation
 general         → normal questions
 deep            → difficult reasoning / planning / analysis
 live-research   → questions that need current information
 knot-tool       → safe in-app navigation requests
```

Each path has its own model setting:

- `CHERUB_FAST_MODEL`
- `CHERUB_GENERAL_MODEL`
- `CHERUB_DEEP_MODEL`

They can all point to the same model during development. Later, a faster/smaller engine can serve casual messages while a stronger engine handles difficult work. Cherub's API and UI do not change when the engines change.

## AI engine

The current engine boundary uses Hugging Face Transformers directly. Cherub loads an engine lazily on first use. The model is not bundled into the Knot ZIP because model weights are large and belong on the Cherub server.

This is deliberately not the identity of Cherub. It is only the current implementation behind the Cherub Core interface.

## Memory

Memory is scoped by the authenticated Supabase user ID. Cherub currently persists explicit `remember ...` requests and communication preferences. It also keeps a short recent conversation window for continuity.

The development database is SQLite. Production should move this to an encrypted, authenticated database with retention and user-controlled deletion.

## Live information

Cherub can trigger lightweight web retrieval when a request is clearly time-sensitive. Retrieved material is treated as untrusted reference data and cannot override Cherub's system rules.

For production, replace the basic retrieval adapter with a dedicated search/crawling service, source validation, caching and rate limits.

## App tools

Cherub can return a small, explicit tool request for safe Knot navigation such as opening Matches, Chats, Activity, Profile or the password-gated Secret Crush page. The Knot frontend executes the navigation itself.

Cherub does **not** receive unrestricted access to private chats, Secret Crush contents, passwords or hidden actions. Sensitive actions should be implemented as authenticated Knot/Supabase operations, not as arbitrary AI tool calls.

## Run

1. Install Python 3.11+ and a suitable PyTorch build for the server hardware
2. Install `requirements.txt`
3. Set a strong `CHERUB_API_TOKEN`
4. Configure the model paths
5. Start:

```sh
python server.py
```

Health:

```sh
curl http://127.0.0.1:8787/health
```

## Production shape

```text
Knot browser
    ↓
Supabase authentication / Cherub Edge Function
    ↓
Cherub backend
    ├── user context
    ├── memory
    ├── Knot knowledge
    ├── safety + privacy
    ├── live research
    ├── app-tool protocol
    └── router
          ├── fast engine
          ├── general engine
          └── deep engine
```

Cherub remains the stable product layer even when the underlying engines are upgraded or replaced.
