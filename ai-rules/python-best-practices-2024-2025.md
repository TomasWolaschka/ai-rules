# Python Best Practices (2024-2025)

## Modern Development Tools & Environment Setup

### Package Management
- **uv by Astral**: The Swiss army knife for Python projects (similar to Rust's cargo)
- **Poetry**: Most popular for application projects with comprehensive dependency management
- **Hatch**: Preferred for Python libraries with well-integrated building and testing features
- **PDM**: Alternative modern package manager with PEP 621 compliance

### Version Management
- **mise** or **pyenv**: Use version managers instead of manual Python installation
- **pipx** or **uv**: Run Python tools in isolated environments automatically
- **Python Version Support**: 
  - Public libraries: Support Python 3.9-3.13 (all actively supported versions)
  - Internal applications: Use latest stable version for performance and features

### Project Configuration
- **pyproject.toml**: The standard configuration file (PEP 518)
- **Poetry 2.0** (released January 2025): Supports both `[project]` and `[tool.poetry]` tables
- **Build System**: Defaults to setuptools if no `[build-system]` specified

## Code Quality & Standards

### Formatting & Style
- **Line Width**: 120 characters is the new standard (though PEP8 still recommends 80)
- **PEP8 Compliance**: Essential for readability and maintainability
- **Tools**: 
  - **Black** or **YAPF**: Auto-formatters
  - **Pylint** or **Flake8**: Style checkers
  - **Ruff**: Fast, modern linter and formatter

### Code Organization
- **Naming Conventions**:
  - Variables & Functions: `snake_case`
  - Classes: `CapWords/CamelCase`
  - Constants: `ALL_CAPS`
  - Modules: `all_lowercase`
- **Import Organization**: Follow PEP8 import ordering
- **Function/Class Size**: Keep functions small and focused

## Type Hinting & Static Analysis

### Type Annotations
- **Essential**: Use type hints for critical applications and shared libraries
- **Modern Syntax**: Use `|` operator for unions in Python 3.10+ (`int | None` vs `Union[int, None]`)
- **Tools**: 
  - **mypy**: Static type checker
  - **pyright**: Microsoft's type checker
  - **pyre**: Facebook's type checker

### Validation Frameworks
- **Pydantic**: Runtime type validation and data modeling (360M+ monthly downloads)
  - Used by FastAPI, Django Ninja, SQLModel, LangChain
  - Supports dataclasses, TypedDict integration
  - Enhanced mypy plugin support
- **dataclasses**: Built-in Python feature for structured data
- **TypedDict**: For dictionary type annotations

## Testing Standards

### Testing Frameworks
- **pytest**: De facto standard testing framework
- **unittest**: Built-in testing framework
- **Coverage.py**: Code coverage measurement

### Testing Best Practices
- Write tests early and frequently
- Keep tests simple, clear, and focused
- Use descriptive test names
- Test edge cases and error conditions
- Maintain good test coverage (aim for 80%+)

### Test Organization
- Separate test files from source code
- Use fixtures for test data setup
- Group related tests in classes
- Use parametrized tests for multiple scenarios

## Documentation

### Docstring Standards
- **PEP 257**: Docstring conventions
- Write docstrings for all public modules, functions, classes, and methods
- Keep docstrings current with code changes
- Don't be redundant for simple, self-explanatory code

### Documentation Tools
- **Sphinx**: Documentation generation
- **MkDocs**: Modern documentation site generator
- **pdoc**: Simple API documentation generator

## Security Best Practices

### Dependency Management
- Regularly update dependencies
- Use dependency scanning tools (Dependabot, Safety)
- Pin dependencies in production
- Use virtual environments for isolation

### Code Security
- Never commit secrets or API keys
- Use environment variables for configuration
- Validate all user inputs
- Use secure coding practices (avoid `eval()`, etc.)

### Security Tools
- **bandit**: Security linter for Python
- **safety**: Check for known security vulnerabilities
- **semgrep**: Static analysis for security patterns

## Performance & Optimization

### Modern Python Features
- **f-strings**: Preferred string formatting method
- **Pathlib**: Modern path handling over `os.path`
- **Context managers**: Proper resource management
- **Generator expressions**: Memory-efficient iterations
- **Type hints**: Enable better optimization

### Performance Tools
- **cProfile**: Built-in profiler
- **py-spy**: Sampling profiler
- **memory_profiler**: Memory usage profiling

## Development Workflow

### Pre-commit Hooks
- **pre-commit**: Framework for managing git pre-commit hooks
- Run linting, formatting, and tests before commits
- Integrate with CI/CD pipelines

### Continuous Integration
- Run tests on multiple Python versions
- Include linting and formatting checks
- Generate coverage reports
- Automate dependency updates

## Modern Python Ecosystem Trends

### AI and Machine Learning Integration
- **Pydantic**: Essential for data validation in ML pipelines
- **FastAPI**: Preferred framework for ML APIs
- **Type hints**: Crucial for AI/ML tooling integration

### Packaging Evolution
- **PEP 621**: Standardized project metadata in pyproject.toml
- **PEP 660**: Editable installs for pyproject.toml-based projects
- **Wheel format**: Standard for binary distributions

### Community Standards
- **Black**: Code formatting consensus
- **pytest**: Testing standard
- **Type hints**: Widely adopted for libraries
- **pyproject.toml**: Configuration file standard

## Tools Integration Examples

### Modern Development Stack
```toml
# pyproject.toml example
[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[project]
name = "my-package"
version = "0.1.0"
description = "Modern Python package"
dependencies = [
    "pydantic>=2.0",
    "fastapi>=0.100",
]

[project.optional-dependencies]
dev = [
    "pytest>=7.0",
    "black>=23.0",
    "mypy>=1.0",
    "ruff>=0.1",
]

[tool.black]
line-length = 120

[tool.mypy]
python_version = "3.11"
strict = true

[tool.ruff]
line-length = 120
select = ["E", "F", "I", "N", "W"]
```

### Pre-commit Configuration
```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/psf/black
    rev: 23.12.1
    hooks:
      - id: black
  - repo: https://github.com/charliermarsh/ruff-pre-commit
    rev: v0.1.9
    hooks:
      - id: ruff
  - repo: https://github.com/pre-commit/mirrors-mypy
    rev: v1.8.0
    hooks:
      - id: mypy
```

## Key Statistics (2024-2025)

- **Python Versions**: 3.9-3.13 actively supported
- **Package Downloads**: 8,000+ packages use Pydantic
- **Adoption**: uv gaining rapid adoption for package management
- **Type Hints**: Consensus reached on their importance
- **Tooling**: Consolidation around Black, pytest, mypy

## Migration Guidelines

### From Legacy Python (3.8 and below)
1. Upgrade to Python 3.9+ for modern features
2. Adopt type hints gradually
3. Switch to pyproject.toml configuration
4. Use modern string formatting (f-strings)

### From setup.py to pyproject.toml
1. Move metadata to `[project]` table
2. Define build system requirements
3. Consolidate tool configurations
4. Update CI/CD pipelines

---

*Last Updated: July 2025*
*Based on current Python ecosystem standards and community best practices*