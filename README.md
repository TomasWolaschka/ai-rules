# AI Rules - Development Discontinued

## 📋 Project Status

**This repository is no longer under active development.**

Based on comprehensive analysis conducted in August 2025, the core premise of automated rule injection may be unnecessary given Claude's 200K token context window and existing capabilities. The research revealed potential over-engineering without concrete evidence that injected rules actually influence coding decisions.

**Key findings from the analysis:**
- Claude's massive context window likely eliminates the need for complex rule injection systems
- No evidence provided that automated rule injection improves code quality in practice
- Current systems may create more noise than value without user control mechanisms
- On-demand rule retrieval (e.g., `/rules <technology>` commands) may be more valuable than automatic injection

## 🛠️ Project Components

This repository contains two implementations of AI-powered rule management systems:

### ai-rules-hooks
**Lightweight Python-based solution** for automatic rule injection into Claude Code using hooks.

- **Approach**: Simple regex-based technology detection with stdout rule injection
- **Features**: KISS-compliant design, YAML configuration, automatic rule generation via Claude CLI
- **Dependencies**: Minimal (PyYAML, Pydantic only)
- **Target**: Direct Claude Code hook integration
- **Philosophy**: Simple, stupid, effective

### ai-rules-typescript  
**Enterprise-grade TypeScript solution** using Model Context Protocol (MCP) for clean rule delivery.

- **Approach**: MCP server with comprehensive architecture including trend analysis, background processing, and monitoring
- **Features**: Autonomous rule generation, WebSocket notifications, Docker deployment, Prometheus metrics
- **Dependencies**: Node.js, Redis, Bull queues, Puppeteer, complete monitoring stack
- **Target**: Production environments with enterprise requirements  
- **Philosophy**: Comprehensive, scalable, feature-rich

## 🔍 Recommended Alternatives

Instead of automated rule injection, consider:

1. **Manual Rule Consultation**: Use dedicated commands like `/rules python` when needed
2. **Project-Specific CLAUDE.md**: Create project documentation with relevant guidelines
3. **Selective Rule Loading**: Load rules only when explicitly requested by developers
4. **Evidence-Based Evaluation**: Track actual instances where rules change coding behavior before building automation

## 📚 Research References

See `.claude/sessions/2025-08-11-1801-Claude Context Injection.md` for detailed analysis of:
- Claude project setup best practices  
- Context injection strategies with pros/cons assessment
- GitHub workflow integration recommendations
- Critical evaluation of rule injection necessity

## 💡 Future Considerations

If development resumes, the following evidence should be collected first:
- Document 3+ specific instances where rules changed coding behavior
- Track actual rule usage patterns for 1+ weeks
- Implement user control mechanisms to prevent rule injection noise
- Consider hybrid approaches with on-demand retrieval

---

*Repository archived pending evidence of practical value for automated rule injection.*