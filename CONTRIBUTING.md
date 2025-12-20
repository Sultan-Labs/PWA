# Contributing to Sultan Wallet

Thank you for your interest in contributing to Sultan Wallet!

## Security

**IMPORTANT**: If you discover a security vulnerability, please DO NOT file a public issue. 
Email security@sltn.io instead. See [SECURITY.md](./SECURITY.md) for details.

## Development Setup

```bash
# Clone the repository
git clone https://github.com/Wollnbergen/sultan-wallet.git
cd sultan-wallet

# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test
```

## Code Style

- TypeScript strict mode enabled
- Use functional components with hooks
- Keep cryptographic operations in `src/core/`
- All new features must have tests

## Pull Request Process

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feat/amazing-feature`)
3. **Write tests** for new functionality
4. **Ensure** all tests pass (`npm test`)
5. **Commit** with conventional commits (`feat:`, `fix:`, `docs:`, etc.)
6. **Push** to your fork
7. **Open** a Pull Request

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add validator registration
fix: correct balance display precision
docs: update security documentation
test: add key derivation tests
refactor: simplify storage encryption
```

## Testing

All code in `src/core/` must have test coverage:

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage (when configured)
npm run test:coverage
```

## Security Guidelines

When contributing to cryptographic code:

1. **Never log** sensitive data (private keys, mnemonics, PINs)
2. **Always wipe** sensitive data after use with `secureWipe()`
3. **Use Uint8Array** instead of strings for sensitive data
4. **Validate inputs** before cryptographic operations
5. **Add tests** for edge cases and error conditions

## Questions?

- Open a GitHub Discussion for questions
- File an issue for bugs (non-security)
- Email security@sltn.io for security issues
