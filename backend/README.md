# Backend — Musique

FastAPI backend, managed with [uv](https://docs.astral.sh/uv/).

## Setup

Install dependencies (creates `.venv` automatically):

```
uv sync
```

## Run

Start the dev server with auto-reload:

```
uv run uvicorn main:app --reload --port 8000
```

- App: http://127.0.0.1:8000
- Interactive docs (Swagger UI): http://127.0.0.1:8000/docs
- Health check: http://127.0.0.1:8000/health

## Testing

Run the test suite:

```
uv run pytest
```

Run only the pure library-scanning unit tests:

```
uv run pytest tests/test_library.py
```

Run only the API integration tests:

```
uv run pytest tests/test_main.py
```

## Dependency management

Add a runtime dependency:

```
uv add <package>
```

Add a dev-only dependency:

```
uv add --dev <package>
```

Remove a dependency:

```
uv remove <package>
```

Upgrade a specific dependency:

```
uv lock --upgrade-package <package>
```

## Running arbitrary scripts

Run any Python file inside the project's virtual environment without activating it manually:

```
uv run python <script.py>
```

## Python version

Project pinned Python version is in `.python-version`. uv installs and manages this automatically — no need to install Python separately.
