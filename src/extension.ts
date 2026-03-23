// The module 'vscode' contains the VS Code extensibility API
import * as vscode from 'vscode';
import * as os from 'os';
import * as path from 'path';
import { ProjectTreeProvider } from './providers/projectTreeProvider';
import { AgentsTreeProvider } from './providers/agentsTreeProvider';
import { RulesScanner } from './scanner/rulesScanner';
import { CommandsScanner } from './scanner/commandsScanner';
import { SkillsScanner } from './scanner/skillsScanner';
import { AgentsScanner, scanAgentDefinitionsForAgentRoot, type AgentDefinition } from './scanner/agentsScanner';
import { AsdlcArtifactScanner } from './scanner/asdlcArtifactScanner';
import { ProjectCommands } from './commands/projectCommands';
import { ProjectManager } from './services/projectManager';
import { ProjectDefinition } from './types/project';
import { Rule } from './scanner/rulesScanner';
import { Command } from './scanner/commandsScanner';
import { EMPTY_PROJECT_STATE, ProjectState } from './scanner/types';
import { Skill } from './scanner/skillsScanner';
import { AsdlcArtifacts } from './scanner/types';
import { VSCodeFsAdapter } from './scanner/adapters/vscodeFsAdapter';
import { scanAgentCommandsCore } from './scanner/core/scanCommandsCore';
import { scanAgentSkillsCore } from './scanner/core/scanSkillsCore';
import type { AgentRootDefinition } from './providers/agentsTreeProvider';
import { registerMcpServerProvider, McpServerProvider } from './mcp/mcpServerProvider';

let treeProvider: ProjectTreeProvider;
let agentsTreeProvider: AgentsTreeProvider | undefined;
let rulesScanner: RulesScanner;
let commandsScanner: CommandsScanner;
let skillsScanner: SkillsScanner;
let agentsScanner: AgentsScanner | undefined;
let asdlcArtifactScanner: AsdlcArtifactScanner;
let projectManager: ProjectManager;
let fileWatcher: vscode.FileSystemWatcher | undefined;
let outputChannel: vscode.OutputChannel;
let mcpServerProvider: McpServerProvider | undefined;
let isActivated = false;
let watchersInitialized = false;
let extensionContext: vscode.ExtensionContext | undefined;

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
		commandsScanner = new CommandsScanner(workspaceRoot);
		skillsScanner = new SkillsScanner(workspaceRoot);
		agentsScanner = new AgentsScanner(workspaceRoot);
		asdlcArtifactScanner = new AsdlcArtifactScanner(workspaceRoot);
	} else {
		outputChannel.appendLine('No workspace root found');
	}

	// Store context for deferred watcher setup
	extensionContext = context;

	// Initialize tree providers with on-demand load (no initial scan)
	outputChannel.appendLine('Initializing tree providers...');
	treeProvider = new ProjectTreeProvider(new Map(), [], null, () => ensureDataLoaded());
	agentsTreeProvider = new AgentsTreeProvider();

	// Register tree data providers
	const workspacesTreeView = vscode.window.createTreeView('aceProjects', {
		treeDataProvider: treeProvider
	});

	const agentsTreeView = vscode.window.createTreeView('aceAgents', {
		treeDataProvider: agentsTreeProvider
	});

	// Register commands
	outputChannel.appendLine('Registering commands...');
	try {
		ProjectCommands.registerCommands(context);
		outputChannel.appendLine('ProjectCommands registered');
		outputChannel.appendLine('All commands registered successfully');
	} catch (error) {
		outputChannel.appendLine(`Error registering commands: ${error}`);
	}

	// Register refresh command
	const refreshCommand = vscode.commands.registerCommand('ace.refresh', async () => {
		outputChannel.appendLine('Manual refresh triggered');
		await ensureDataLoaded();
	});

	// Register MCP server provider (pass getProjects so list_projects includes added projects e.g. Agency)
	outputChannel.appendLine('Registering MCP server provider...');
	try {
		mcpServerProvider = registerMcpServerProvider(context, () => projectManager.getProjects(), outputChannel);
		outputChannel.appendLine('MCP server provider registered successfully');
	} catch (error) {
		outputChannel.appendLine(`Warning: Failed to register MCP server provider: ${error}`);
		// Continue without MCP - extension still functions
	}

	// Lazy scanning: no initial data load, no file watchers at activation.
	// Watchers and first scan happen when tree view requests data (getChildren).

	// Add subscriptions
	context.subscriptions.push(
		workspacesTreeView,
		agentsTreeView,
		refreshCommand,
		outputChannel
	);

	outputChannel.appendLine('Agent Context Explorer extension setup complete');
}

async function ensureDataLoaded(): Promise<void> {
	await refreshData();
	if (!extensionContext) {return;}
	if (!watchersInitialized) {
		watchersInitialized = true;
		const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri;
		if (workspaceRoot) {
			setupFileWatcher();
			if (fileWatcher) {
				extensionContext.subscriptions.push(fileWatcher);
			}
		}
		const globalCommandsWatcher = setupGlobalCommandsWatcher();
		if (globalCommandsWatcher) {
			extensionContext.subscriptions.push(globalCommandsWatcher);
		}
		const globalSkillsWatcher = setupGlobalSkillsWatcher();
		if (globalSkillsWatcher) {
			extensionContext.subscriptions.push(globalSkillsWatcher);
		}
		const globalAgentsWatcher = setupGlobalAgentsWatcher();
		if (globalAgentsWatcher) {
			extensionContext.subscriptions.push(globalAgentsWatcher);
		}
		outputChannel.appendLine('File watchers registered (lazy setup)');
	}
}

// This method is called when your extension is deactivated
export function deactivate() {
	isActivated = false;
	// fileWatcher and global watchers are in context.subscriptions (when setup)
	// and are disposed automatically; no explicit dispose needed here
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
		treeProvider.setLoading(true);
		outputChannel.appendLine('Refreshing ACE workspaces...');

		// Always scan the current workspace first
		const currentWorkspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri;
		const projectData = new Map<string, {
			rules: Rule[],
			state: ProjectState,
			commands: Command[],
			globalCommands: Command[],
			skills: Skill[],
			globalSkills: Skill[],
			agentDefinitions: AgentDefinition[],
			asdlcArtifacts: AsdlcArtifacts
		}>();

		// Scan global commands and skills once (shared across all projects)
		const [globalCommands, globalSkills] = await Promise.all([
			commandsScanner?.scanGlobalCommands() || Promise.resolve([]),
			skillsScanner?.scanGlobalSkills() || Promise.resolve([])
		]);
		outputChannel.appendLine(`Scanned global: ${globalCommands.length} commands, ${globalSkills.length} skills`);

		if (currentWorkspaceRoot) {
			outputChannel.appendLine(`Scanning current workspace: ${currentWorkspaceRoot.fsPath}`);

			// Scan current workspace rules, state, commands, skills, and ASDLC artifacts
			const [currentRules, currentCommands, currentSkills, currentAsdlcArtifacts, currentAgentDefs] = await Promise.all([
				rulesScanner?.scanRules() || Promise.resolve([]),
				commandsScanner?.scanWorkspaceCommands() || Promise.resolve([]),
				skillsScanner?.scanWorkspaceSkills() || Promise.resolve([]),
				asdlcArtifactScanner?.scanAll() || Promise.resolve({ agentsMd: { exists: false, sections: [] }, specs: { exists: false, specs: [] }, schemas: { exists: false, schemas: [] }, hasAnyArtifacts: false }),
				agentsScanner?.scanWorkspaceAgentDefinitions() || Promise.resolve([])
			]);

			// Use workspace path as the key for current workspace
			const workspaceKey = 'current-workspace';
			projectData.set(workspaceKey, {
				rules: currentRules,
				state: EMPTY_PROJECT_STATE,
				commands: currentCommands,
				globalCommands,
				skills: currentSkills,
				globalSkills,
				agentDefinitions: currentAgentDefs,
				asdlcArtifacts: currentAsdlcArtifacts
			});

			const logMessage = `Scanned current workspace: ${currentRules.length} rules, ${currentCommands.length} commands, ${currentSkills.length} skills, ${currentAgentDefs.length} agent definitions, ASDLC: ${currentAsdlcArtifacts.hasAnyArtifacts ? 'Yes' : 'No'}`;
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
				const projectCommandsScanner = new CommandsScanner(projectUri);
				const projectSkillsScanner = new SkillsScanner(projectUri);
				const projectAgentsScanner = new AgentsScanner(projectUri);
				const projectAsdlcScanner = new AsdlcArtifactScanner(projectUri);

				// Scan rules, commands, skills, agent definitions, and ASDLC artifacts for this project
				const [rules, commands, skills, asdlcArtifacts, agentDefinitions] = await Promise.all([
					projectRulesScanner.scanRules(),
					projectCommandsScanner.scanWorkspaceCommands(),
					projectSkillsScanner.scanWorkspaceSkills(),
					projectAsdlcScanner.scanAll(),
					projectAgentsScanner.scanWorkspaceAgentDefinitions()
				]);

				projectData.set(project.id, {
					rules,
					state: EMPTY_PROJECT_STATE,
					commands,
					globalCommands,
					skills,
					globalSkills,
					agentDefinitions,
					asdlcArtifacts
				});
				const logMessage = `Scanned project ${project.name}: ${rules.length} rules, ${commands.length} commands, ${skills.length} skills, ${agentDefinitions.length} agent definitions`;
				outputChannel.appendLine(logMessage);
			} catch (error) {
				const errorMessage = `Error scanning project ${project.name}: ${error}`;
				outputChannel.appendLine(errorMessage);
				// Add empty data for failed projects
				projectData.set(project.id, {
					rules: [],
					state: EMPTY_PROJECT_STATE,
					commands: [],
					globalCommands: globalCommands,
					skills: [],
					globalSkills: globalSkills,
					agentDefinitions: [],
					asdlcArtifacts: {
						agentsMd: { exists: false, sections: [] },
						specs: { exists: false, specs: [] },
						schemas: { exists: false, schemas: [] },
						hasAnyArtifacts: false
					}
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
		treeProvider.setDataLoaded(true);
		treeProvider.setLoading(false);

		// Refresh the Workspaces tree view
		treeProvider.refresh();

		const successMessage = `Refreshed ${allProjects.length} resources`;
		outputChannel.appendLine(successMessage);

		// Resolve agent roots (Cursor, Claude, Global) and populate Agents view data
		if (agentsTreeProvider) {
			try {
				const agentRoots = await resolveAgentRootsWithData();
				agentsTreeProvider.setAgentRoots(agentRoots);
				outputChannel.appendLine(
					`Updated Agents view roots: ${agentRoots.map(r => r.label).join(', ') || 'none'}`
				);
			} catch (agentError) {
				outputChannel.appendLine(`Error resolving agent roots: ${agentError}`);
			}
		}
	} catch (error) {
		treeProvider.setLoading(false);
		const errorMessage = `Error refreshing data: ${error}`;
		outputChannel.appendLine(errorMessage);
		vscode.window.showErrorMessage(`Failed to refresh data: ${error instanceof Error ? error.message : 'Unknown error'}`);
	}
}

async function resolveAgentRootsWithData(): Promise<AgentRootDefinition[]> {
	const roots: AgentRootDefinition[] = [];
	const homeDir = os.homedir();
	const fsAdapter = new VSCodeFsAdapter();

	const candidates: Array<{
		id: string;
		label: string;
		dir: string;
		icon: string;
	}> = [
		{
			id: 'cursor',
			label: 'Cursor',
			dir: path.join(homeDir, '.cursor'),
			icon: 'symbol-namespace'
		},
		{
			id: 'claude',
			label: 'Claude',
			dir: path.join(homeDir, '.claude'),
			icon: 'symbol-namespace'
		},
		{
			id: 'global',
			label: 'Global',
			dir: path.join(homeDir, '.agents'),
			icon: 'globe'
		}
	];

	for (const candidate of candidates) {
		try {
			const uri = vscode.Uri.file(candidate.dir);
			const stat = await vscode.workspace.fs.stat(uri);
			if (stat.type !== vscode.FileType.Directory) {
				continue;
			}

			// Scan commands, skills, and agent definitions for this agent root
			const [coreCommands, coreSkills, agentDefinitions] = await Promise.all([
				sampleScanAgentCommands(fsAdapter, candidate.dir),
				sampleScanAgentSkills(fsAdapter, candidate.dir),
				scanAgentDefinitionsForAgentRoot(candidate.dir)
			]);

			const commands: Command[] = coreCommands.map(c => ({
				uri: vscode.Uri.file(c.path),
				content: c.content,
				fileName: c.fileName,
				location: 'global'
			}));

			const skills: Skill[] = coreSkills.map(s => ({
				uri: vscode.Uri.file(s.path),
				content: s.content,
				fileName: s.fileName,
				location: 'global',
				metadata: s.metadata
			}));

			roots.push({
				id: candidate.id,
				label: candidate.label,
				description: candidate.dir,
				icon: candidate.icon,
				commands,
				skills,
				agentDefinitions
			});
		} catch {
			// Directory missing or not accessible; skip this root
		}
	}

	return roots;
}

async function sampleScanAgentCommands(fs: VSCodeFsAdapter, agentRoot: string) {
	return scanAgentCommandsCore(fs, agentRoot);
}

async function sampleScanAgentSkills(fs: VSCodeFsAdapter, agentRoot: string) {
	return scanAgentSkillsCore(fs, agentRoot);
}

function setupFileWatcher() {
	const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri;
	if (!workspaceRoot) {return;}

	// Watch for changes in project .cursor/rules only (not **/.cursor/ - excludes test/fixtures)
	const rulesPattern = new vscode.RelativePattern(workspaceRoot, '.cursor/rules/**/*.{mdc,md}');
	const rulesWatcher = vscode.workspace.createFileSystemWatcher(rulesPattern);

	// Watch for changes in .cursor/commands directory (flat structure)
	const commandsPattern = new vscode.RelativePattern(workspaceRoot, '.cursor/commands/*.md');
	const commandsWatcher = vscode.workspace.createFileSystemWatcher(commandsPattern);

	// Watch for changes in .cursor/skills directories (SKILL.md files)
	const skillsPattern = new vscode.RelativePattern(workspaceRoot, '.cursor/skills/*/SKILL.md');
	const skillsWatcher = vscode.workspace.createFileSystemWatcher(skillsPattern);

	// Watch for changes in .cursor/agents (flat + nested *.md; scanner uses flat only)
	const agentsPattern = new vscode.RelativePattern(workspaceRoot, '.cursor/agents/**/*.md');
	const agentsWatcher = vscode.workspace.createFileSystemWatcher(agentsPattern);

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

	// Skills watcher handlers
	skillsWatcher.onDidCreate(() => {
		outputChannel.appendLine('Skill file created, refreshing...');
		refreshData();
	});

	skillsWatcher.onDidChange(() => {
		outputChannel.appendLine('Skill file changed, refreshing...');
		refreshData();
	});

	skillsWatcher.onDidDelete(() => {
		outputChannel.appendLine('Skill file deleted, refreshing...');
		refreshData();
	});

	// Agents watcher handlers (workspace agent definition files)
	agentsWatcher.onDidCreate(() => {
		outputChannel.appendLine('Agent definition file created, refreshing...');
		refreshData();
	});

	agentsWatcher.onDidChange(() => {
		outputChannel.appendLine('Agent definition file changed, refreshing...');
		refreshData();
	});

	agentsWatcher.onDidDelete(() => {
		outputChannel.appendLine('Agent definition file deleted, refreshing...');
		refreshData();
	});

	// Combine watchers for disposal
	fileWatcher = {
		...rulesWatcher,
		dispose: () => {
			rulesWatcher.dispose();
			commandsWatcher.dispose();
			skillsWatcher.dispose();
			agentsWatcher.dispose();
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

function setupGlobalSkillsWatcher(): vscode.FileSystemWatcher | undefined {
	// Watch for changes in global .cursor/skills directory
	try {
		const homeDir = os.homedir();
		const globalSkillsPattern = path.join(homeDir, '.cursor', 'skills', '*', 'SKILL.md');
		const globalSkillsWatcher = vscode.workspace.createFileSystemWatcher(globalSkillsPattern);

		// Global skills watcher handlers
		globalSkillsWatcher.onDidCreate(() => {
			outputChannel.appendLine('Global skill file created, refreshing...');
			refreshData();
		});

		globalSkillsWatcher.onDidChange(() => {
			outputChannel.appendLine('Global skill file changed, refreshing...');
			refreshData();
		});

		globalSkillsWatcher.onDidDelete(() => {
			outputChannel.appendLine('Global skill file deleted, refreshing...');
			refreshData();
		});

		outputChannel.appendLine('Global skills file watcher created successfully');
		return globalSkillsWatcher;
	} catch (error) {
		outputChannel.appendLine(`Unable to watch global skills directory: ${error instanceof Error ? error.message : String(error)}`);
		// Continue without global skills watcher - extension still functions
		return undefined;
	}
}

function setupGlobalAgentsWatcher(): vscode.FileSystemWatcher | undefined {
	// Watch ~/.cursor/agents/*.md (mirrors global commands/skills; Agents view Cursor root)
	try {
		const homeDir = os.homedir();
		const globalAgentsPattern = path.join(homeDir, '.cursor', 'agents', '*.md');
		const globalAgentsWatcher = vscode.workspace.createFileSystemWatcher(globalAgentsPattern);

		globalAgentsWatcher.onDidCreate(() => {
			outputChannel.appendLine('Global agent definition file created, refreshing...');
			refreshData();
		});

		globalAgentsWatcher.onDidChange(() => {
			outputChannel.appendLine('Global agent definition file changed, refreshing...');
			refreshData();
		});

		globalAgentsWatcher.onDidDelete(() => {
			outputChannel.appendLine('Global agent definition file deleted, refreshing...');
			refreshData();
		});

		outputChannel.appendLine('Global agents file watcher created successfully');
		return globalAgentsWatcher;
	} catch (error) {
		outputChannel.appendLine(`Unable to watch global agents directory: ${error instanceof Error ? error.message : String(error)}`);
		return undefined;
	}
}
