// The module 'vscode' contains the VS Code extensibility API
import * as vscode from 'vscode';
import * as os from 'os';
import * as path from 'path';
import { ProjectTreeProvider } from './providers/projectTreeProvider';
import { StateSectionContentProvider } from './providers/stateSectionContentProvider';
import { RulesScanner } from './scanner/rulesScanner';
import { StateScanner } from './scanner/stateScanner';
import { CommandsScanner } from './scanner/commandsScanner';
import { StateCommands } from './commands/stateCommands';
import { ProjectCommands } from './commands/projectCommands';
import { ProjectManager } from './services/projectManager';
import { ProjectDefinition } from './types/project';
import { Rule } from './scanner/rulesScanner';
import { ProjectState } from './scanner/stateScanner';
import { Command } from './scanner/commandsScanner';
import { registerMcpServerProvider, McpServerProvider } from './mcp/mcpServerProvider';

let treeProvider: ProjectTreeProvider;
let rulesScanner: RulesScanner;
let stateScanner: StateScanner;
let commandsScanner: CommandsScanner;
let projectManager: ProjectManager;
let fileWatcher: vscode.FileSystemWatcher | undefined;
let outputChannel: vscode.OutputChannel;
let mcpServerProvider: McpServerProvider | undefined;
let isActivated = false;

// This method is called when your extension is activated
export function activate(context: vscode.ExtensionContext) {
	// Prevent multiple activations
	if (isActivated) {
		return;
	}
	isActivated = true;

	// Create output channel for better logging visibility
	outputChannel = vscode.window.createOutputChannel('Agent Context Explorer');
	outputChannel.show();
	outputChannel.appendLine('=== Agent Context Explorer extension activated ===');

	const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri;

	// Initialize services
	outputChannel.appendLine('Initializing ProjectManager...');
	projectManager = new ProjectManager(context);

	// Initialize scanners only if we have a workspace
	if (workspaceRoot) {
		outputChannel.appendLine(`Workspace root found: ${workspaceRoot.fsPath}`);
		rulesScanner = new RulesScanner(workspaceRoot);
		stateScanner = new StateScanner(workspaceRoot);
		commandsScanner = new CommandsScanner(workspaceRoot);
	} else {
		outputChannel.appendLine('No workspace root found');
	}

	// Initialize tree provider
	outputChannel.appendLine('Initializing tree provider...');
	treeProvider = new ProjectTreeProvider(new Map(), [], null);

	// Register tree data provider
	const treeProviderRegistration = vscode.window.createTreeView('aceExplorer', {
		treeDataProvider: treeProvider
	});

	// Register state section content provider (for read-only views)
	outputChannel.appendLine('Registering state section content provider...');
	const stateSectionContentProvider = StateSectionContentProvider.register(context);
	outputChannel.appendLine('State section content provider registered');

	// Register commands
	outputChannel.appendLine('Registering commands...');
	try {
		StateCommands.registerCommands(context, stateSectionContentProvider);
		outputChannel.appendLine('StateCommands registered');
		ProjectCommands.registerCommands(context);
		outputChannel.appendLine('ProjectCommands registered');
		outputChannel.appendLine('All commands registered successfully');
	} catch (error) {
		outputChannel.appendLine(`Error registering commands: ${error}`);
	}

	// Register refresh command
	const refreshCommand = vscode.commands.registerCommand('ace.refresh', async () => {
		outputChannel.appendLine('Manual refresh triggered');
		await refreshData();
	});

	// Register MCP server provider
	outputChannel.appendLine('Registering MCP server provider...');
	try {
		mcpServerProvider = registerMcpServerProvider(context);
		outputChannel.appendLine('MCP server provider registered successfully');
	} catch (error) {
		outputChannel.appendLine(`Warning: Failed to register MCP server provider: ${error}`);
		// Continue without MCP - extension still functions
	}

	// Set up file watcher (only if we have a workspace)
	if (workspaceRoot) {
		outputChannel.appendLine('Setting up file watcher...');
		setupFileWatcher();
	}

	// Always set up global commands watcher (workspace-independent)
	outputChannel.appendLine('Setting up global commands file watcher...');
	const globalCommandsWatcher = setupGlobalCommandsWatcher();
	if (globalCommandsWatcher) {
		context.subscriptions.push(globalCommandsWatcher);
	}

	// Initial data load (non-blocking)
	outputChannel.appendLine('Starting initial data load...');
	refreshData().then(() => {
		outputChannel.appendLine('Initial data load completed successfully');
	}).catch(error => {
		outputChannel.appendLine(`Error during initial data load: ${error}`);
	});

	// Add subscriptions
	context.subscriptions.push(
		treeProviderRegistration,
		refreshCommand,
		fileWatcher!,
		outputChannel
	);

	outputChannel.appendLine('Agent Context Explorer extension setup complete');
}

// This method is called when your extension is deactivated
export function deactivate() {
	isActivated = false;
	if (fileWatcher) {
		fileWatcher.dispose();
	}
	if (outputChannel) {
		outputChannel.dispose();
	}
	if (treeProvider) {
		treeProvider.dispose();
	}
	if (mcpServerProvider) {
		mcpServerProvider.dispose();
	}
}

async function refreshData() {
	try {
		outputChannel.appendLine('Refreshing project rules and state...');

		// Always scan the current workspace first
		const currentWorkspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri;
		const projectData = new Map<string, { rules: Rule[], state: ProjectState, commands: Command[], globalCommands: Command[] }>();

		// Scan global commands once (shared across all projects)
		const globalCommands = await (commandsScanner?.scanGlobalCommands() || Promise.resolve([]));
		outputChannel.appendLine(`Scanned global commands: ${globalCommands.length} commands`);

		if (currentWorkspaceRoot) {
			outputChannel.appendLine(`Scanning current workspace: ${currentWorkspaceRoot.fsPath}`);

			// Scan current workspace rules, state, and commands
			const [currentRules, currentState, currentCommands] = await Promise.all([
				rulesScanner?.scanRules() || Promise.resolve([]),
				stateScanner?.scanState() || Promise.resolve({ languages: [], frameworks: [], dependencies: [], buildTools: [], testing: [], codeQuality: [], developmentTools: [], architecture: [], configuration: [], documentation: [] }),
				commandsScanner?.scanWorkspaceCommands() || Promise.resolve([])
			]);

			// Use workspace path as the key for current workspace
			const workspaceKey = 'current-workspace';
			projectData.set(workspaceKey, { rules: currentRules, state: currentState, commands: currentCommands, globalCommands });

			const logMessage = `Scanned current workspace: ${currentRules.length} rules, ${currentState.languages.length + currentState.frameworks.length + currentState.dependencies.length + currentState.buildTools.length + currentState.testing.length + currentState.codeQuality.length + currentState.developmentTools.length + currentState.architecture.length + currentState.configuration.length + currentState.documentation.length} state items, ${currentCommands.length} workspace commands, ${globalCommands.length} global commands`;
			outputChannel.appendLine(logMessage);
		}

		// Get stored projects and scan them as additional projects
		const [projects, currentProject] = await Promise.all([
			projectManager.getProjects(),
			projectManager.getCurrentProject()
		]);

		// Scan additional stored projects (excluding current workspace)
		for (const project of projects) {
			// Skip if this project is the current workspace
			if (currentWorkspaceRoot && project.path === currentWorkspaceRoot.fsPath) {
				continue;
			}

			try {
				const projectUri = vscode.Uri.file(project.path);
				const projectRulesScanner = new RulesScanner(projectUri);
				const projectStateScanner = new StateScanner(projectUri);
				const projectCommandsScanner = new CommandsScanner(projectUri);

				// Scan rules, state, and commands for this project
				const [rules, state, commands] = await Promise.all([
					projectRulesScanner.scanRules(),
					projectStateScanner.scanState(),
					projectCommandsScanner.scanWorkspaceCommands()
				]);

				projectData.set(project.id, { rules, state, commands, globalCommands });
				const logMessage = `Scanned project ${project.name}: ${rules.length} rules, ${state.languages.length + state.frameworks.length + state.dependencies.length + state.buildTools.length + state.testing.length + state.codeQuality.length + state.developmentTools.length + state.architecture.length + state.configuration.length + state.documentation.length} state items, ${commands.length} workspace commands, ${globalCommands.length} global commands`;
				outputChannel.appendLine(logMessage);
			} catch (error) {
				const errorMessage = `Error scanning project ${project.name}: ${error}`;
				outputChannel.appendLine(errorMessage);
				// Add empty data for failed projects
				projectData.set(project.id, {
					rules: [],
					state: {
						// Technology Stack
						languages: [],
						frameworks: [],
						dependencies: [],

						// Development Environment
						buildTools: [],
						testing: [],
						codeQuality: [],
						developmentTools: [],

						// Project Structure
						architecture: [],
						configuration: [],
						documentation: []
					},
					commands: [],
					globalCommands: globalCommands
				});
			}
		}

		// Update tree provider with all project data
		// Create a virtual project for the current workspace
		const allProjects = [...projects];
		if (currentWorkspaceRoot) {
			allProjects.unshift({
				id: 'current-workspace',
				name: 'Current Workspace',
				path: currentWorkspaceRoot.fsPath,
				description: 'Current workspace',
				lastAccessed: new Date(),
				active: true
			});
		}

		const finalCurrentProject = allProjects.find(p => p.active) || allProjects[0] || null;
		treeProvider.updateData(projectData, allProjects, finalCurrentProject);

		// Refresh the tree view
		treeProvider.refresh();

		const successMessage = `Refreshed ${allProjects.length} projects (including current workspace)`;
		outputChannel.appendLine(successMessage);
	} catch (error) {
		const errorMessage = `Error refreshing data: ${error}`;
		outputChannel.appendLine(errorMessage);
		vscode.window.showErrorMessage(`Failed to refresh data: ${error instanceof Error ? error.message : 'Unknown error'}`);
	}
}

function setupFileWatcher() {
	const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri;
	if (!workspaceRoot) {return;}

	// Watch for changes in .cursor/rules directories
	const rulesPattern = new vscode.RelativePattern(workspaceRoot, '**/.cursor/rules/**/*.{mdc,md}');
	const rulesWatcher = vscode.workspace.createFileSystemWatcher(rulesPattern);

	// Watch for changes in .cursor/commands directory (flat structure)
	const commandsPattern = new vscode.RelativePattern(workspaceRoot, '.cursor/commands/*.md');
	const commandsWatcher = vscode.workspace.createFileSystemWatcher(commandsPattern);

	// Rules watcher handlers
	rulesWatcher.onDidCreate(() => {
		outputChannel.appendLine('Rule file created, refreshing...');
		refreshData();
	});

	rulesWatcher.onDidChange(() => {
		outputChannel.appendLine('Rule file changed, refreshing...');
		refreshData();
	});

	rulesWatcher.onDidDelete(() => {
		outputChannel.appendLine('Rule file deleted, refreshing...');
		refreshData();
	});

	// Commands watcher handlers
	commandsWatcher.onDidCreate(() => {
		outputChannel.appendLine('Command file created, refreshing...');
		refreshData();
	});

	commandsWatcher.onDidChange(() => {
		outputChannel.appendLine('Command file changed, refreshing...');
		refreshData();
	});

	commandsWatcher.onDidDelete(() => {
		outputChannel.appendLine('Command file deleted, refreshing...');
		refreshData();
	});

	// Combine watchers for disposal
	fileWatcher = {
		...rulesWatcher,
		dispose: () => {
			rulesWatcher.dispose();
			commandsWatcher.dispose();
		}
	} as vscode.FileSystemWatcher;
}

function setupGlobalCommandsWatcher(): vscode.FileSystemWatcher | undefined {
	// Watch for changes in global .cursor/commands directory
	try {
		const homeDir = os.homedir();
		const globalCommandsPattern = path.join(homeDir, '.cursor', 'commands', '*.md');
		const globalCommandsWatcher = vscode.workspace.createFileSystemWatcher(globalCommandsPattern);

		// Global commands watcher handlers
		globalCommandsWatcher.onDidCreate(() => {
			outputChannel.appendLine('Global command file created, refreshing...');
			refreshData();
		});

		globalCommandsWatcher.onDidChange(() => {
			outputChannel.appendLine('Global command file changed, refreshing...');
			refreshData();
		});

		globalCommandsWatcher.onDidDelete(() => {
			outputChannel.appendLine('Global command file deleted, refreshing...');
			refreshData();
		});

		outputChannel.appendLine('Global commands file watcher created successfully');
		return globalCommandsWatcher;
	} catch (error) {
		outputChannel.appendLine(`Unable to watch global commands directory: ${error instanceof Error ? error.message : String(error)}`);
		// Continue without global commands watcher - extension still functions
		return undefined;
	}
}
