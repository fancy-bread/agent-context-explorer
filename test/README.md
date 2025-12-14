# Project Rules Explorer - Test Suite

This directory contains comprehensive tests for the Project Rules Explorer VS Code extension, covering all major functionality including rule management, project state detection, tree view operations, and extension lifecycle.

## Test Organization

Tests are organized into categories by purpose and test type:

```
test/suite/
├── unit/              # Pure unit tests (no VS Code dependencies) - run with `npm run test:unit`
├── integration/       # Integration tests (require VS Code environment) - run with `npm test`
├── scanner/           # Scanner and parser tests
├── parser/            # Language-specific parser tests
├── commands/          # Command handler tests
├── ui/                # UI and tree view tests
└── enhanced/          # Enhanced state detection tests
```

## Test Categories

### Unit Tests (`test/suite/unit/`)
**Purpose**: Pure unit tests that don't require VS Code environment
**Run with**: `npm run test:unit`
**Files**:
- `coreLogic.test.ts` - Core business logic validation
- `deduplicator.test.ts` - Array and dependency deduplication utilities
- `commandsScanner.test.ts` - Command file scanning logic
- `agentGuidanceGenerator.test.ts` - Agent guidance generation

### Integration Tests (`test/suite/integration/`)
**Purpose**: Tests extension loading, activation, and complete workflows
**Run with**: `npm test` (VS Code test environment)
**Files**:
- `extension.test.ts` - Extension activation and command registration
- `extensionLifecycle.test.ts` - Extension lifecycle, activation, deactivation, resource management
- `integration.test.ts` - End-to-end integration tests covering complete workflows
- `realRulesIntegration.test.ts` - Real-world rule integration scenarios

### Scanner Tests (`test/suite/scanner/`)
**Purpose**: Tests file scanning and parsing functionality
**Run with**: `npm test` (VS Code test environment)
**Files**:
- `rulesScanner.test.ts` - Rule file scanning and MDC format validation
- `stateScanner.test.ts` - Project state detection and analysis
- `mdcParser.test.ts` - MDC (Markdown with YAML frontmatter) parsing and generation

### Parser Tests (`test/suite/parser/`)
**Purpose**: Tests language-specific project parsers
**Run with**: `npm test` (VS Code test environment)
**Files**:
- `nodeParser.test.ts` - Node.js/npm project parsing
- `pythonParser.test.ts` - Python project parsing
- `dotnetParser.test.ts` - .NET project parsing
- `ciParser.test.ts` - CI/CD configuration parsing

### Command Tests (`test/suite/commands/`)
**Purpose**: Tests user command handlers
**Run with**: `npm test` (VS Code test environment)
**Files**:
- `ruleCommands.test.ts` - Rule management commands (create, copy, paste, delete, rename)
- `projectCommands.test.ts` - Project management commands and operations

### UI Tests (`test/suite/ui/`)
**Purpose**: Tests user interface and tree view functionality
**Run with**: `npm test` (VS Code test environment)
**Files**:
- `ruleLabels.test.ts` - Rule display in tree view, label removal, context-aware icons
- `iconDetection.test.ts` - Context-aware icon assignment for rules based on content
- `iconAnalysis.test.ts` - Icon analysis and assignment logic
- `fileWatcher.test.ts` - File system watching and change detection

### Enhanced State Tests (`test/suite/enhanced/`)
**Purpose**: Tests enhanced project state detection features
**Run with**: `npm test` (VS Code test environment)
**Files**:
- `agentGuidanceGenerator.test.ts` - Agent guidance generation (also in unit/)
- `architectureDetector.test.ts` - Architecture pattern detection
- `capabilityExtractor.test.ts` - Project capability extraction
- `dependencyPurposeMapper.test.ts` - Dependency purpose mapping
- `enhancedStateIntegration.test.ts` - Enhanced state integration scenarios
- `maturityDetector.test.ts` - Project maturity detection
- `projectTypeDetector.test.ts` - Project type detection
- `vscodeAnalyzer.test.ts` - VS Code-specific analysis

## Running Tests

### Unit Tests Only (Fast, No VS Code)
```bash
npm run test:unit
```
Runs pure unit tests that don't require VS Code environment. These tests are fast and can run in any Node.js environment.

### All Integration Tests (Full VS Code Environment)
```bash
npm test
```
Runs all tests including integration, scanner, parser, command, UI, and enhanced tests. Requires VS Code test environment.

### Compile Tests Only
```bash
npm run compile:test
```

### Run Tests with Coverage
```bash
npm run test:coverage
```

## Test Coverage

The comprehensive test suite covers:

### ✅ **Core Functionality**
- MDC parsing and generation
- Project state detection and analysis
- Rule file scanning and management
- File system operations and watching
- Array and dependency deduplication

### ✅ **Extension Lifecycle**
- Extension activation and deactivation
- Command registration and execution
- Resource management and cleanup
- Error handling and recovery

### ✅ **User Interface**
- Tree view structure and display
- Context-aware icon assignment
- Rule labeling and grouping
- File watching and real-time updates

### ✅ **User Commands**
- Rule management (create, copy, paste, delete, rename)
- Project management (create, edit, remove, switch)
- Context menu functionality
- Input validation and user feedback

### ✅ **Integration Workflows**
- Complete project setup workflows
- Rule management workflows
- State scanning and analysis
- File system integration

### ✅ **Language Support**
- Node.js/npm project detection
- Python project detection
- .NET project detection
- CI/CD configuration parsing

### ✅ **Enhanced Features**
- Architecture pattern detection
- Project capability extraction
- Dependency purpose mapping
- Project maturity assessment
- Project type detection

## Test Fixtures

The test suite includes comprehensive test data:
- **Sample Rule Files**: Valid and invalid MDC files for testing (`test/test-fixtures/`)
- **Project Configurations**: Various project setups and structures
- **Mock Data**: VS Code API mocks and test utilities
- **Edge Cases**: Error conditions and boundary testing

## Troubleshooting

### Common Issues

1. **VS Code Module Not Found**: Tests that require VS Code modules must run in the VS Code test environment (`npm test`). Use `npm run test:unit` for pure unit tests.
2. **TypeScript Compilation Errors**: Ensure all dependencies are properly typed
3. **Test Timeout**: Some tests may timeout if VS Code environment is not properly initialized
4. **Mock Configuration**: Ensure VS Code mocks are properly configured for each test
5. **Import Path Errors**: After moving test files, ensure import paths are updated (e.g., `../../src/` → `../../../src/`)

### Debug Mode

To run tests with verbose output:
```bash
node ./out/test/runTest.js --reporter spec
```

### Test-Specific Debugging

For specific test categories:
```bash
# Run only unit tests
npm run test:unit

# Run only integration tests (requires VS Code)
npm test -- --grep "Extension"

# Run only UI tests
npm test -- --grep "Rule Display"

# Run only command tests
npm test -- --grep "Rule Commands"
```

## Adding New Tests

When adding new tests:

1. **Choose the right category**: Place tests in the appropriate directory based on their purpose
   - Pure logic without VS Code? → `unit/`
   - Requires VS Code environment? → `integration/`, `scanner/`, `parser/`, `commands/`, `ui/`, or `enhanced/`
2. **Follow naming convention**: `*.test.ts`
3. **Use descriptive test names**: Clear, specific test descriptions
4. **Include comprehensive coverage**: Positive, negative, and edge cases
5. **Test error conditions**: Ensure proper error handling
6. **Update this README**: Document new test files
7. **Mock VS Code APIs**: Use proper mocks for VS Code dependencies
8. **Test isolation**: Ensure tests don't interfere with each other
9. **Fix import paths**: Use correct relative paths based on directory structure

## Test Dependencies

- **Mocha**: Test framework and runner
- **TypeScript**: Compilation and type checking
- **VS Code Test API**: Extension testing framework (for integration tests)
- **Assert**: Assertion library for test validation
- **Custom Mocks**: VS Code API mocks and test utilities

## Test Architecture

### Mock Strategy
- **VS Code APIs**: Comprehensive mocks for all VS Code dependencies
- **File System**: Mock file operations for testing
- **User Interface**: Mock tree view and command interactions
- **Extension Context**: Mock extension lifecycle and resource management

### Test Organization
- **Unit Tests**: Individual component testing without VS Code
- **Integration Tests**: Cross-component workflow testing with VS Code
- **End-to-End Tests**: Complete user scenario testing
- **Error Testing**: Edge cases and error condition validation

## Current Test Status

**Total Test Files**: 28
**Test Categories**: 7 (Unit, Integration, Scanner, Parser, Commands, UI, Enhanced)
**Unit Tests**: 4 files (run with `npm run test:unit`)
**Integration Tests**: 24 files (run with `npm test`)
**Coverage Areas**: 20+ major functionality areas
**Test Quality**: Comprehensive with positive, negative, and edge case testing

The test suite provides robust coverage of all extension functionality, ensuring reliability and maintainability of the Project Rules Explorer extension.
