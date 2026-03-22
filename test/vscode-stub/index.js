/**
 * VSCode API stub for unit tests.
 * Add as devDependency: "vscode": "file:./test/vscode-stub"
 * Tests can override __overrides.findFiles, __overrides.stat, __overrides.readDirectory.
 */

const os = require('os');
const overrides = { findFiles: null, stat: null, readDirectory: null };

const workspace = {
	fs: {
		readDirectory: async (uri) => {
			if (overrides.readDirectory) return overrides.readDirectory(uri);
			const p = uri.fsPath.replace(/\/$/, '');
			const home = os.homedir();
			// Workspace commands: /workspace/.cursor/commands
			if ((p === '/workspace/.cursor/commands' || (p.endsWith('/.cursor/commands') && p.includes('/workspace'))) && !p.includes(home)) {
				return [['valid-command.md', 1], ['security-audit.md', 1], ['error-command.md', 1]];
			}
			// Global commands: ~/.cursor/commands
			if (p === home + '/.cursor/commands' || (p.endsWith('/.cursor/commands') && p.startsWith(home))) {
				return [['global-command.md', 1]];
			}
			// Rules: /workspace/.cursor/rules (flat - files only)
			if (p === '/workspace/.cursor/rules' || (p.endsWith('/.cursor/rules') && p.includes('/workspace'))) {
				return [['valid-rule.mdc', 1], ['invalid-rule.mdc', 1], ['another-rule.mdc', 1]];
			}
			return [];
		},
		readFile: async (uri) => {
			const path = uri.fsPath;
			// Rule files (check invalid before valid - invalid contains 'valid' substring)
			if (path.endsWith('invalid-rule.mdc')) {
				return Buffer.from(`---
description: "Invalid rule"
---

# Invalid Rule

Missing globs.`);
			}
			if (path.endsWith('valid-rule.mdc')) {
				return Buffer.from(`---
description: "Valid rule"
globs: ["*.js", "*.ts"]
alwaysApply: false
---

# Valid Rule

This is a valid rule content.`);
			}
			if (path.endsWith('another-rule.mdc')) {
				return Buffer.from(`---
description: "Another rule"
alwaysApply: true
---

# Another Rule

Content.`);
			}
			// Command files
			if (path.includes('valid-command.md')) {
				return Buffer.from(`# Code Review Checklist

## Overview
Comprehensive checklist for conducting thorough code reviews.

## Review Categories

### Functionality
- [ ] Code does what it's supposed to do
- [ ] Edge cases are handled
- [ ] Error handling is appropriate`);
			}
			if (path.includes('security-audit.md')) {
				return Buffer.from(`# Security Audit

## Overview
Comprehensive security review to identify and fix vulnerabilities.

## Steps
1. Dependency audit
2. Code security review
3. Infrastructure security`);
			}
			if (path.includes('error-command.md')) {
				throw new Error('Permission denied');
			}
			if (path.endsWith('read-error.mdc') || path.includes('/read-error.mdc')) {
				throw new Error('File not found');
			}
			if (path.includes('global-command.md')) {
				return Buffer.from(`# Global Command

## Overview
This is a global command available across all workspaces.

## Usage
Use this command from any workspace.`);
			}
			return Buffer.from('# Test Command\n\nThis is a test command.');
		},
		stat: async (uri) => {
			if (overrides.stat) return overrides.stat(uri);
			if (uri.fsPath.includes('/missing') && uri.fsPath.includes('.cursor/commands')) {
				throw new Error('Directory not found');
			}
			if (uri.fsPath.includes('.cursor/commands') || uri.fsPath.includes('.cursor/rules')) {
				return { type: 2 };
			}
			return { type: 2 };
		},
		createDirectory: async () => {},
		writeFile: async () => {},
		delete: async () => {}
	},
	findFiles: async (pattern) => {
		if (overrides.findFiles) return overrides.findFiles(pattern);
		if (pattern.pattern && pattern.pattern.includes('.cursor/rules')) {
			const base = (pattern.workspaceRoot && (pattern.workspaceRoot.fsPath || pattern.workspaceRoot)) || '/workspace';
			const basePath = typeof base === 'string' ? base : base.fsPath || '/workspace';
			if (pattern.pattern.endsWith('*.mdc')) {
				return [
					{ fsPath: `${basePath}/.cursor/rules/valid-rule.mdc`, path: `${basePath}/.cursor/rules/valid-rule.mdc` },
					{ fsPath: `${basePath}/.cursor/rules/invalid-rule.mdc`, path: `${basePath}/.cursor/rules/invalid-rule.mdc` },
					{ fsPath: `${basePath}/.cursor/rules/another-rule.mdc`, path: `${basePath}/.cursor/rules/another-rule.mdc` }
				];
			}
			if (pattern.pattern.endsWith('*.md')) {
				return [];
			}
		}
		if (pattern.pattern && pattern.pattern.includes('.cursor/commands')) {
			return [
				{ fsPath: '/workspace/.cursor/commands/valid-command.md', path: '/workspace/.cursor/commands/valid-command.md' },
				{ fsPath: '/workspace/.cursor/commands/security-audit.md', path: '/workspace/.cursor/commands/security-audit.md' },
				{ fsPath: '/workspace/.cursor/commands/error-command.md', path: '/workspace/.cursor/commands/error-command.md' }
			];
		}
		if (pattern.pattern === '*.md' && pattern.workspaceRoot && String(pattern.workspaceRoot).includes('.cursor/commands')) {
			const root = String(pattern.workspaceRoot);
			return [
				{ fsPath: `${root}/global-command.md`, path: `${root}/global-command.md` }
			];
		}
		return [];
	},
	createFileSystemWatcher: () => ({
		onDidCreate: () => ({ dispose: () => {} }),
		onDidChange: () => ({ dispose: () => {} }),
		onDidDelete: () => ({ dispose: () => {} }),
		dispose: () => {}
	}),
	openTextDocument: async () => ({})
};

const Uri = {
	joinPath: (base, ...paths) => ({ fsPath: `${base.fsPath}/${paths.join('/')}`, path: `${base.fsPath || base.path || ''}/${paths.join('/')}` }),
	file: (p) => ({ fsPath: p, path: p })
};

class EventEmitter {
	constructor() {
		this._listeners = [];
	}
	fire() {
		this._listeners.forEach(l => l());
	}
	dispose() {
		this._listeners = [];
	}
	get event() {
		const self = this;
		return function (listener) {
			self._listeners.push(listener);
			return { dispose: () => { self._listeners = self._listeners.filter(l => l !== listener); } };
		};
	}
}

class RelativePattern {
	constructor(workspaceRoot, pattern) {
		this.workspaceRoot = workspaceRoot;
		this.pattern = pattern;
	}
}

const FileType = { Unknown: 0, File: 1, Directory: 2, SymbolicLink: 64 };

const commands = {
	registerCommand: () => ({ dispose: () => {} }),
	executeCommand: async () => {}
};

const window = {
	showErrorMessage: () => {},
	showInformationMessage: () => {},
	showWarningMessage: async () => 'No',
	showInputBox: async () => undefined,
	showTextDocument: async () => ({}),
	createOutputChannel: () => ({
		appendLine: () => {},
		show: () => {},
		dispose: () => {}
	}),
	createTreeView: () => ({ dispose: () => {} })
};

const TreeItemCollapsibleState = { None: 0, Collapsed: 1, Expanded: 2 };

class ThemeIcon {
	constructor(id) { this.id = id; }
}

class TreeItem {
	constructor(label, collapsibleState) {
		this.label = label;
		this.collapsibleState = collapsibleState;
	}
}

module.exports = {
	workspace,
	Uri,
	RelativePattern,
	EventEmitter,
	TreeItemCollapsibleState,
	ThemeIcon,
	TreeItem,
	FileType,
	commands,
	window,
	__overrides: overrides
};
