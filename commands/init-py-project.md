---
description: Initialize Python FastAPI project with database support
---

# Initialize Python Project

Initialize a Python FastAPI project with PostgreSQL database support using uv and Alembic.

## Project Name: $ARGUMENTS

If `$ARGUMENTS` is not provided, use the current directory name as the project name.

---

## Phase 1: Check Project State

First, determine if this is an empty project or an existing one:

```bash
ls -la
```

- **If empty** (no pyproject.toml): Proceed to Phase 2 to create project scaffold
- **If existing** (has pyproject.toml): Skip to Phase 3 to start the project

---

## Phase 2: Create Project Scaffold (Empty Project Only)

### 2.1 Create pyproject.toml

Create a `pyproject.toml` with FastAPI, SQLAlchemy, Alembic, and common dependencies:

```toml
[project]
name = "{project-name}"
version = "0.1.0"
description = ""
readme = "README.md"
requires-python = ">=3.11"
dependencies = [
    "fastapi>=0.115.0",
    "uvicorn[standard]>=0.32.0",
    "sqlalchemy>=2.0.0",
    "asyncpg>=0.29.0",
    "pydantic-settings>=2.6.0",
    "alembic>=1.14.0",
    "python-dotenv>=1.0.0",
]

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[tool.uv]
dev-dependencies = [
    "pytest>=8.0.0",
    "pytest-asyncio>=0.24.0",
    "httpx>=0.27.0",
    "ruff>=0.8.0",
]
```

### 2.2 Create .env.example

```env
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/{project-name}
DATABASE_SYNC_URL=postgresql://postgres:postgres@localhost:5432/{project-name}
```

### 2.3 Create docker-compose.yml

```yaml
services:
  db:
    image: postgres:16-alpine
    container_name: {project-name}-db
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: {project-name}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
```

### 2.4 Create Application Structure

```
app/
├── __init__.py
├── main.py           # FastAPI app entry point
├── config.py         # Settings and configuration
├── database.py       # Database connection
├── models/           # SQLAlchemy models
│   └── __init__.py
├── schemas/          # Pydantic schemas
│   └── __init__.py
├── routers/          # API routers
│   ├── __init__.py
│   └── health.py
└── services/         # Business logic
    └── __init__.py
```

### 2.5 Create Core Files

**app/main.py:**
```python
from fastapi import FastAPI
from app.routers import health
from app.database import create_tables

app = FastAPI(title="{Project Name}")

app.include_router(health.router)

@app.on_event("startup")
async def startup():
    await create_tables()
```

**app/config.py:**
```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/{project-name}"

    class Config:
        env_file = ".env"

settings = Settings()
```

**app/database.py:**
```python
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.config import settings

engine = create_async_engine(settings.database_url, echo=True)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

class Base(DeclarativeBase):
    pass

async def create_tables():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

async def get_session() -> AsyncSession:
    async with async_session() as session:
        yield session
```

**app/routers/health.py:**
```python
from fastapi import APIRouter

router = APIRouter(tags=["Health"])

@router.get("/health")
async def health_check():
    return {"status": "healthy"}

@router.get("/health/db")
async def db_health():
    from app.database import engine
    try:
        async with engine.connect():
            return {"status": "healthy"}
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}
```

### 2.6 Initialize Alembic

After installing dependencies, initialize Alembic:

```bash
uv sync
uv run alembic init alembic
```

Then configure `alembic/env.py` for async support.

### 2.7 Create .gitignore

```gitignore
.env
__pycache__/
*.py[cod]
.venv/
*.egg-info/
dist/
build/
.pytest_cache/
.ruff_cache/
```

---

## Phase 3: Start Project

### 3.1 Create Environment File

```bash
cp .env.example .env
```

### 3.2 Install Dependencies

```bash
uv sync
```

### 3.3 Start Database

```bash
docker-compose up -d db
```

Wait for database to be ready (check with `docker-compose logs db`).

### 3.4 Run Database Migrations

```bash
uv run alembic upgrade head
```

If no migrations exist yet, create an initial migration:

```bash
uv run alembic revision --autogenerate -m "Initial migration"
uv run alembic upgrade head
```

### 3.5 Start Development Server

```bash
uv run uvicorn app.main:app --reload --port 5432
```

---

## Phase 4: Validate Setup

```bash
# Test API health
curl -s http://localhost:5432/health

# Test database connection
curl -s http://localhost:5432/health/db
```

Both should return `{"status":"healthy"}` responses.

---

## Access Points

- API: http://localhost:5432
- Swagger UI: http://localhost:5432/docs
- ReDoc: http://localhost:5432/redoc
- Health Check: http://localhost:5432/health
- Database: localhost:5432

---

## Output Report

After initialization, provide:

1. **Project Type**: New scaffold created OR Existing project started
2. **Files Created**: List of all files created
3. **Services Running**: Database and API status
4. **Next Steps**: Suggestions for development

---

## Cleanup

To stop services:
```bash
# Stop dev server: Ctrl+C
# Stop database: docker-compose down
```
