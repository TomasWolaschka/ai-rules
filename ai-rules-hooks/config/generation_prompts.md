# Claude Rule Generation Prompts

This file contains templates for generating best practice rules via Claude CLI.

## Default Prompt Template

```
Please generate comprehensive {technology} best practices for {year}.

Create a detailed guide that includes:

## Core Principles
- Modern {technology} development standards
- Industry-accepted conventions and patterns
- Performance optimization guidelines

## Code Quality Standards  
- Naming conventions and style guidelines
- Code organization and structure
- Documentation requirements

## Security Best Practices
- Common security vulnerabilities to avoid
- Secure coding patterns
- Dependency management security

## Testing and Quality Assurance
- Testing frameworks and methodologies
- Code coverage expectations
- Quality metrics and tools

## Modern Tooling and Ecosystem
- Recommended development tools
- Build and deployment practices
- Popular libraries and frameworks

## Performance Guidelines
- Optimization techniques
- Monitoring and profiling
- Resource management

Please format as a comprehensive Markdown document with clear sections, 
practical examples, and actionable guidance. Focus on current {year} 
standards and emerging trends in the {technology} ecosystem.

The output should be production-ready content that developers can immediately 
apply to improve their {technology} development practices.
```

## Technology-Specific Customizations

You can customize prompts for specific technologies by modifying the update_rules.py script
to use different templates based on the technology being processed.

### Python-Specific Additions
- Include modern package management (uv, poetry)
- Cover type hinting and static analysis
- Address async/await patterns
- Include testing with pytest

### JavaScript-Specific Additions  
- Cover modern ES features
- Include TypeScript recommendations
- Address bundling and build tools
- Cover testing frameworks (Jest, Vitest)

### Java-Specific Additions
- Include modern Java features (17, 21)
- Cover Spring ecosystem updates
- Address build tools (Maven, Gradle)
- Include testing patterns

## Prompt Variables

Available variables for template substitution:
- `{technology}` - Technology name (e.g., "python", "javascript")
- `{year}` - Current year
- `{date}` - Current date in YYYY-MM-DD format

## Usage Notes

1. Templates are automatically loaded by `update_rules.py`
2. If this file doesn't exist, default templates are used
3. Customize templates to match your organization's standards
4. Test prompt changes with small updates before bulk generation