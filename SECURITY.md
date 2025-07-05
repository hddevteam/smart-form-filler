# Security Policy

## Supported Versions

We actively support the following versions of Smart Form Filler with security updates:

| Version | Supported          |
| ------- | ------------------ |
| 2.0.x   | ✅ |
| 1.0.x   | ❌ |

## Reporting a Vulnerability

We take security seriously. If you discover a security vulnerability in Smart Form Filler, please follow these guidelines:

### 🚨 Immediate Action Required

**DO NOT** create a public GitHub issue for security vulnerabilities.

### 📧 Private Reporting

Please report security vulnerabilities by emailing us at:
- **Security Team**: [Create a private security advisory](https://github.com/hddevteam/smart-form-filler/security/advisories/new)

### 📋 What to Include

When reporting a vulnerability, please include:

1. **Description**: Clear description of the vulnerability
2. **Steps to Reproduce**: Detailed steps to reproduce the issue
3. **Impact**: Potential impact and severity assessment
4. **Environment**: Browser version, OS, extension version
5. **Evidence**: Screenshots, logs, or proof-of-concept (if safe to share)

### ⏰ Response Timeline

- **Initial Response**: Within 48 hours
- **Assessment**: Within 7 days
- **Resolution**: Depends on severity, typically within 30 days
- **Disclosure**: Coordinated disclosure after fix is available

### 🔒 Security Scope

We consider the following in scope for security reports:

#### High Priority
- **Data Exfiltration**: Unauthorized access to user data
- **Code Injection**: XSS, script injection, or similar attacks
- **Permission Escalation**: Gaining unauthorized browser permissions
- **Authentication Bypass**: Circumventing security controls
- **AI Model Abuse**: Malicious use of AI integration

#### Medium Priority
- **Information Disclosure**: Unintended information exposure
- **Session Management**: Issues with state or session handling
- **Input Validation**: Improper validation leading to security issues
- **Dependency Vulnerabilities**: Known vulnerabilities in dependencies

#### Out of Scope
- **Social Engineering**: Attacks requiring user social engineering
- **Physical Security**: Physical access to user devices
- **Denial of Service**: Simple DoS attacks without data compromise
- **Rate Limiting**: Issues that don't lead to data exposure
- **UI/UX Issues**: That don't have security implications

### 🛡️ Security Measures

We implement several security measures:

#### Extension Security
- **Minimal Permissions**: Only request necessary browser permissions
- **Content Security Policy**: Strict CSP to prevent injection attacks
- **Input Sanitization**: All user inputs are properly validated
- **Secure Communication**: HTTPS for all external communications

#### Backend Security
- **API Authentication**: Secure API endpoint protection
- **Input Validation**: Comprehensive input validation and sanitization
- **Error Handling**: Secure error messages without information leakage
- **Dependency Management**: Regular updates and vulnerability scanning

#### AI Model Security
- **Data Privacy**: Local processing when possible (Ollama)
- **Prompt Injection Protection**: Safeguards against malicious prompts
- **Model Isolation**: Isolated model execution environments
- **Rate Limiting**: Protection against abuse

### 🏆 Recognition

We believe in responsible disclosure and will:

- **Credit researchers** in release notes (unless anonymity is requested)
- **Provide timeline updates** throughout the resolution process
- **Publish advisories** for significant vulnerabilities after fixes are deployed

### 📚 Security Resources

- [OWASP Browser Security Guide](https://owasp.org/www-project-web-security-testing-guide/)
- [Chrome Extension Security Best Practices](https://developer.chrome.com/docs/extensions/mv3/security/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)

### 📞 Contact Information

- **Security Advisories**: [GitHub Security Advisories](https://github.com/hddevteam/smart-form-filler/security/advisories)
- **General Questions**: [Create an Issue](https://github.com/hddevteam/smart-form-filler/issues/new/choose)
- **Documentation**: [Contributing Guidelines](.github/CONTRIBUTING.md)

---

**Thank you for helping keep Smart Form Filler secure!** 🔒
