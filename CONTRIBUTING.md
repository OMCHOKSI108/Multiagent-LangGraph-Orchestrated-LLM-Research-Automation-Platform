# Contributing to Multi-Agent LLM Research Automation Platform

Thank you for your interest in contributing to our project! We welcome contributions from the community.

## How to Contribute

### 1. Fork the Repository
```bash
git clone https://github.com/OMCHOKSI108/Multiagent-LangGraph-Orchestrated-LLM-Research-Automation-Platform.git
cd Multiagent-LangGraph-Orchestrated-LLM-Research-Automation-Platform
```

### 2. Create a Feature Branch
```bash
git checkout -b feature/your-feature-name
```

### 3. Make Your Changes
- Follow the existing code style
- Add tests for new features
- Update documentation as needed
- Ensure all tests pass

### 4. Commit Your Changes
```bash
git commit -m "Add: Brief description of your changes"
```

### 5. Push and Create Pull Request
```bash
git push origin feature/your-feature-name
```

## Development Guidelines

### Code Style
- **Python**: Follow PEP 8
- **JavaScript/TypeScript**: Use ESLint configuration
- **Commits**: Use conventional commit format

### Testing
- Add unit tests for new agents
- Test pipelines end-to-end
- Ensure compatibility across LLM providers

### Documentation
- Update README for new features
- Add docstrings to Python functions
- Update API documentation

## Agent Development

### Creating New Agents
1. Extend `BaseAgent` class
2. Implement `run()` method
3. Add to `agents/registry.py`
4. Include comprehensive tests

### Agent Best Practices
- Handle errors gracefully
- Implement token limiting
- Add proper logging
- Support multiple LLM providers

## Reporting Issues

When reporting bugs, please include:
- Steps to reproduce
- Expected vs actual behavior
- Environment details (OS, Python/Node versions)
- Error logs

## Feature Requests

We welcome feature requests! Please:
- Check existing issues first
- Provide detailed use case
- Explain the benefit to the project

## License

By contributing, you agree that your contributions will be licensed under the MIT License.