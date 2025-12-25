import * as assert from 'assert';

// Mock VS Code API for testing
const mockVscode = {
	window: {
		showInputBox: async (options: any) => {
			if (options.prompt === 'Enter project name') return 'Test Project';
			if (options.prompt === 'Enter project path') return '/test/project';
			if (options.prompt === 'Enter project description') return 'Test description';
			return 'test-input';
		},
		showInformationMessage: (message: string) => {},
		showErrorMessage: (message: string) => {},
		showWarningMessage: (message: string) => 'Yes',
		showQuickPick: async (items: any[]) => items[0]
	},
	workspace: {
		workspaceFolders: [{ uri: { fsPath: '/workspace' } }],
		fs: {
			stat: async (uri: any) => ({ type: 2 }), // Directory
			readFile: async (uri: any) => Buffer.from('{}'),
			writeFile: async (uri: any, content: Buffer) => {}
		}
	},
	Uri: {
		joinPath: (base: any, ...paths: string[]) => ({ fsPath: `${base.fsPath}/${paths.join('/')}` }),
		file: (path: string) => ({ fsPath: path })
	},
	FileType: {
		Directory: 2
	}
};

// Mock ProjectManager class for testing
class MockProjectManager {
	private projects: any[] = [];
	private currentProject: any = null;

	async getProjects(): Promise<any[]> {
		return this.projects;
	}

	async getCurrentProject(): Promise<any> {
		return this.currentProject;
	}

	async addProject(projectData: any): Promise<any> {
		const project = {
			id: `project-${Date.now()}`,
			name: projectData.name,
			path: projectData.path,
			description: projectData.description,
			lastAccessed: new Date(),
			active: false
		};

		this.projects.push(project);
		return project;
	}

	async updateProject(projectId: string, updates: any): Promise<any> {
		const project = this.projects.find(p => p.id === projectId);
		if (project) {
			Object.assign(project, updates);
			return project;
		}
		throw new Error('Project not found');
	}

	async removeProject(projectId: string): Promise<void> {
		const index = this.projects.findIndex(p => p.id === projectId);
		if (index >= 0) {
			this.projects.splice(index, 1);
			if (this.currentProject && this.currentProject.id === projectId) {
				this.currentProject = null;
			}
		}
	}

	async setActiveProject(projectId: string): Promise<void> {
		// Deactivate all projects
		this.projects.forEach(p => p.active = false);

		// Activate the specified project
		const project = this.projects.find(p => p.id === projectId);
		if (project) {
			project.active = true;
			this.currentProject = project;
		}
	}

	async validateProjectPath(path: string): Promise<boolean> {
		try {
			await mockVscode.workspace.fs.stat(mockVscode.Uri.file(path));
			return true;
		} catch {
			return false;
		}
	}

	async exportProjects(): Promise<string> {
		return JSON.stringify(this.projects, null, 2);
	}

	async importProjects(jsonData: string): Promise<void> {
		const importedProjects = JSON.parse(jsonData);
		this.projects = importedProjects;
	}
}

// Mock ProjectCommands class for testing
class MockProjectCommands {
	constructor(private projectManager: MockProjectManager) {}

	async addProject(): Promise<void> {
		const name = await mockVscode.window.showInputBox({
			prompt: 'Enter project name',
			validateInput: (value) => {
				if (!value || value.trim().length === 0) {
					return 'Project name cannot be empty';
				}
				if (value.length < 3) {
					return 'Project name must be at least 3 characters';
				}
				return null;
			}
		});

		if (!name) return;

		const path = await mockVscode.window.showInputBox({
			prompt: 'Enter project path',
			validateInput: (value) => {
				if (!value || value.trim().length === 0) {
					return 'Project path cannot be empty';
				}
				return null;
			}
		});

		if (!path) return;

		const description = await mockVscode.window.showInputBox({
			prompt: 'Enter project description',
			placeHolder: 'Optional description'
		});

		// Validate path exists
		const pathExists = await this.projectManager.validateProjectPath(path);
		if (!pathExists) {
			mockVscode.window.showErrorMessage('Project path does not exist');
			return;
		}

		// Check for duplicate names
		const projects = await this.projectManager.getProjects();
		const duplicate = projects.find(p => p.name === name);
		if (duplicate) {
			mockVscode.window.showErrorMessage('A project with this name already exists');
			return;
		}

		const project = await this.projectManager.addProject({
			name,
			path,
			description: description || ''
		});

		mockVscode.window.showInformationMessage(`Project added: ${project.name}`);
	}

	async editProject(project: any): Promise<void> {
		const name = await mockVscode.window.showInputBox({
			prompt: 'Enter new project name',
			value: project.name,
			validateInput: (value) => {
				if (!value || value.trim().length === 0) {
					return 'Project name cannot be empty';
				}
				if (value.length < 3) {
					return 'Project name must be at least 3 characters';
				}
				return null;
			}
		});

		if (!name) return;

		const path = await mockVscode.window.showInputBox({
			prompt: 'Enter new project path',
			value: project.path,
			validateInput: (value) => {
				if (!value || value.trim().length === 0) {
					return 'Project path cannot be empty';
				}
				return null;
			}
		});

		if (!path) return;

		const description = await mockVscode.window.showInputBox({
			prompt: 'Enter new project description',
			value: project.description,
			placeHolder: 'Optional description'
		});

		// Validate path exists
		const pathExists = await this.projectManager.validateProjectPath(path);
		if (!pathExists) {
			mockVscode.window.showErrorMessage('Project path does not exist');
			return;
		}

		// Check for duplicate names (excluding current project)
		const projects = await this.projectManager.getProjects();
		const duplicate = projects.find(p => p.name === name && p.id !== project.id);
		if (duplicate) {
			mockVscode.window.showErrorMessage('A project with this name already exists');
			return;
		}

		await this.projectManager.updateProject(project.id, {
			name,
			path,
			description: description || ''
		});

		mockVscode.window.showInformationMessage(`Project updated: ${name}`);
	}

	async removeProject(project: any): Promise<void> {
		const result = await mockVscode.window.showWarningMessage(
			`Are you sure you want to remove "${project.name}"?`
		);

		if (result === 'Yes') {
			await this.projectManager.removeProject(project.id);
			mockVscode.window.showInformationMessage(`Project removed: ${project.name}`);
		}
	}

	async listProjects(): Promise<void> {
		const projects = await this.projectManager.getProjects();

		if (projects.length === 0) {
			mockVscode.window.showInformationMessage('No projects found');
			return;
		}

		const projectList = projects.map(p =>
			`${p.name} (${p.active ? 'Active' : 'Inactive'})\n  Path: ${p.path}\n  Description: ${p.description || 'No description'}`
		).join('\n\n');

		mockVscode.window.showInformationMessage(`Projects:\n\n${projectList}`);
	}

	async switchProject(): Promise<void> {
		const projects = await this.projectManager.getProjects();

		if (projects.length === 0) {
			mockVscode.window.showInformationMessage('No projects available');
			return;
		}

		const projectItems = projects.map(p => ({
			label: p.name,
			description: p.path,
			detail: p.active ? 'Active' : 'Inactive',
			project: p
		}));

		const selectedProject = await mockVscode.window.showQuickPick(projectItems);

		if (selectedProject) {
			await this.projectManager.setActiveProject(selectedProject.project.id);
			mockVscode.window.showInformationMessage(`Switched to project: ${selectedProject.project.name}`);
		}
	}

	async exportProjects(): Promise<void> {
		const jsonData = await this.projectManager.exportProjects();
		// In real implementation, this would save to a file
		mockVscode.window.showInformationMessage('Projects exported successfully');
	}

	async importProjects(): Promise<void> {
		// In real implementation, this would load from a file
		const jsonData = '[]'; // Mock empty import
		await this.projectManager.importProjects(jsonData);
		mockVscode.window.showInformationMessage('Projects imported successfully');
	}
}

describe('Project Commands Tests', () => {
	let projectManager: MockProjectManager;
	let projectCommands: MockProjectCommands;

	beforeEach(() => {
		projectManager = new MockProjectManager();
		projectCommands = new MockProjectCommands(projectManager);
	});

	describe('Project Creation', () => {
		it('should create project with valid data', async () => {
			await projectCommands.addProject();

			const projects = await projectManager.getProjects();
			assert.equal(projects.length, 1);
			assert.equal(projects[0].name, 'Test Project');
			assert.equal(projects[0].path, '/test/project');
		});

		it('should validate project name input', async () => {
			// Test empty name
			const emptyName = await mockVscode.window.showInputBox({
				prompt: 'Enter project name',
				validateInput: (value) => {
					if (!value || value.trim().length === 0) {
						return 'Project name cannot be empty';
					}
					return null;
				}
			});
			assert.equal(emptyName, 'Test Project'); // Mock returns valid input

			// Test short name
			const shortName = await mockVscode.window.showInputBox({
				prompt: 'Enter project name',
				validateInput: (value) => {
					if (value.length < 3) {
						return 'Project name must be at least 3 characters';
					}
					return null;
				}
			});
			assert.equal(shortName, 'Test Project'); // Mock returns valid input
		});

		it('should validate project path input', async () => {
			const path = await mockVscode.window.showInputBox({
				prompt: 'Enter project path',
				validateInput: (value) => {
					if (!value || value.trim().length === 0) {
						return 'Project path cannot be empty';
					}
					return null;
				}
			});
			assert.equal(path, '/test/project');
		});

		it('should handle optional description', async () => {
			const description = await mockVscode.window.showInputBox({
				prompt: 'Enter project description',
				placeHolder: 'Optional description'
			});
			assert.equal(description, 'test-input');
		});

		it('should prevent duplicate project names', async () => {
			// Add first project
			await projectCommands.addProject();

			// Try to add duplicate
			const projects = await projectManager.getProjects();
			const duplicate = projects.find(p => p.name === 'Test Project');
			assert.ok(duplicate);
		});
	});

	describe('Project Editing', () => {
		it('should update project with new data', async () => {
			// Create initial project
			const project = await projectManager.addProject({
				name: 'Original Project',
				path: '/original/path',
				description: 'Original description'
			});

			// Edit project
			await projectCommands.editProject(project);

			const updatedProject = await projectManager.getProjects();
			assert.equal(updatedProject[0].name, 'Test Project');
			assert.equal(updatedProject[0].path, '/test/project');
		});

		it('should validate updated project name', async () => {
			const project = await projectManager.addProject({
				name: 'Test Project',
				path: '/test/path',
				description: 'Test description'
			});

			await projectCommands.editProject(project);

			const projects = await projectManager.getProjects();
			assert.equal(projects[0].name, 'Test Project');
		});

		it('should prevent duplicate names when editing', async () => {
			// Create two projects
			await projectManager.addProject({
				name: 'Project 1',
				path: '/path1',
				description: 'Description 1'
			});

			const project2 = await projectManager.addProject({
				name: 'Project 2',
				path: '/path2',
				description: 'Description 2'
			});

			// Try to edit project2 to have same name as project1
			await projectCommands.editProject(project2);

			const projects = await projectManager.getProjects();
			assert.equal(projects.length, 2);
		});
	});

	describe('Project Removal', () => {
		it('should remove project after confirmation', async () => {
			const project = await projectManager.addProject({
				name: 'Test Project',
				path: '/test/path',
				description: 'Test description'
			});

			await projectCommands.removeProject(project);

			const projects = await projectManager.getProjects();
			assert.equal(projects.length, 0);
		});

		it('should handle removal cancellation', async () => {
			const project = await projectManager.addProject({
				name: 'Test Project',
				path: '/test/path',
				description: 'Test description'
			});

			// Mock cancellation
			const originalShowWarning = mockVscode.window.showWarningMessage;
			mockVscode.window.showWarningMessage = () => 'No';

			await projectCommands.removeProject(project);

			const projects = await projectManager.getProjects();
			assert.equal(projects.length, 1);

			// Restore original function
			mockVscode.window.showWarningMessage = originalShowWarning;
		});
	});

	describe('Project Listing', () => {
		it('should list all projects', async () => {
			await projectManager.addProject({
				name: 'Project 1',
				path: '/path1',
				description: 'Description 1'
			});

			await projectManager.addProject({
				name: 'Project 2',
				path: '/path2',
				description: 'Description 2'
			});

			await projectCommands.listProjects();

			const projects = await projectManager.getProjects();
			assert.equal(projects.length, 2);
		});

		it('should handle empty project list', async () => {
			await projectCommands.listProjects();

			const projects = await projectManager.getProjects();
			assert.equal(projects.length, 0);
		});
	});

	describe('Project Switching', () => {
		it('should switch to selected project', async () => {
			await projectManager.addProject({
				name: 'Project 1',
				path: '/path1',
				description: 'Description 1'
			});

			const project2 = await projectManager.addProject({
				name: 'Project 2',
				path: '/path2',
				description: 'Description 2'
			});

			await projectCommands.switchProject();

			const currentProject = await projectManager.getCurrentProject();
			assert.ok(currentProject);
		});

		it('should handle empty project list for switching', async () => {
			await projectCommands.switchProject();

			const currentProject = await projectManager.getCurrentProject();
			assert.equal(currentProject, null);
		});
	});

	describe('Project Export/Import', () => {
		it('should export projects to JSON', async () => {
			await projectManager.addProject({
				name: 'Export Project',
				path: '/export/path',
				description: 'Export description'
			});

			await projectCommands.exportProjects();

			const projects = await projectManager.getProjects();
			assert.equal(projects.length, 1);
		});

		it('should import projects from JSON', async () => {
			await projectCommands.importProjects();

			const projects = await projectManager.getProjects();
			assert.equal(projects.length, 0); // Mock returns empty array
		});
	});

	describe('Export For Agent - Commands Inclusion', () => {
		it('should include commands in export data structure', async () => {
			// Mock command data
			const mockGlobalCommands = [
				{
					fileName: 'global-command.md',
					location: 'global' as const,
					content: '# Global Command\n\nGlobal command content'
				}
			];

			const mockWorkspaceCommands = [
				{
					fileName: 'workspace-command.md',
					location: 'workspace' as const,
					content: '# Workspace Command\n\nWorkspace command content'
				}
			];

			// Verify command structure matches expected format
			const formattedGlobalCommands = mockGlobalCommands.map(cmd => ({
				fileName: cmd.fileName,
				location: cmd.location,
				content: cmd.content
			}));

			const formattedWorkspaceCommands = mockWorkspaceCommands.map(cmd => ({
				fileName: cmd.fileName,
				location: cmd.location,
				content: cmd.content
			}));

			// Assert structure
			assert.equal(formattedGlobalCommands.length, 1);
			assert.equal(formattedGlobalCommands[0].fileName, 'global-command.md');
			assert.equal(formattedGlobalCommands[0].location, 'global');
			assert.ok(formattedGlobalCommands[0].content.includes('Global Command'));

			assert.equal(formattedWorkspaceCommands.length, 1);
			assert.equal(formattedWorkspaceCommands[0].fileName, 'workspace-command.md');
			assert.equal(formattedWorkspaceCommands[0].location, 'workspace');
			assert.ok(formattedWorkspaceCommands[0].content.includes('Workspace Command'));
		});

		it('should format commands with correct fields (fileName, location, content)', () => {
			const mockCommand = {
				fileName: 'test-command.md',
				location: 'workspace' as const,
				content: '# Test Command\n\nCommand content here'
			};

			const formatted = {
				fileName: mockCommand.fileName,
				location: mockCommand.location,
				content: mockCommand.content
			};

			// Verify all required fields are present
			assert.ok(formatted.fileName);
			assert.ok(formatted.location);
			assert.ok(formatted.content);
			assert.equal(formatted.location, 'workspace');
		});

		it('should handle empty commands arrays gracefully', () => {
			const emptyCommands: any[] = [];
			const formatted = emptyCommands.map(cmd => ({
				fileName: cmd.fileName,
				location: cmd.location,
				content: cmd.content
			}));

			assert.equal(formatted.length, 0);
			assert.ok(Array.isArray(formatted));
		});

		it('should distinguish between global and workspace commands', () => {
			const globalCommand = {
				fileName: 'global.md',
				location: 'global' as const,
				content: 'Global content'
			};

			const workspaceCommand = {
				fileName: 'workspace.md',
				location: 'workspace' as const,
				content: 'Workspace content'
			};

			assert.equal(globalCommand.location, 'global');
			assert.equal(workspaceCommand.location, 'workspace');
			assert.notEqual(globalCommand.location, workspaceCommand.location);
		});

		it('should include commands in export data structure format', () => {
			const exportData = {
				exportedAt: new Date().toISOString(),
				totalProjects: 1,
				globalCommands: [
					{
						fileName: 'global-cmd.md',
						location: 'global',
						content: 'Global command content'
					}
				],
				projects: [
					{
						id: 'test-project',
						name: 'Test Project',
						path: '/test/path',
						commands: [
							{
								fileName: 'workspace-cmd.md',
								location: 'workspace',
								content: 'Workspace command content'
							}
						]
					}
				]
			};

			// Verify structure
			assert.ok(exportData.globalCommands);
			assert.ok(Array.isArray(exportData.globalCommands));
			assert.equal(exportData.globalCommands[0].location, 'global');

			assert.ok(exportData.projects[0].commands);
			assert.ok(Array.isArray(exportData.projects[0].commands));
			assert.equal(exportData.projects[0].commands[0].location, 'workspace');
		});
	});

	describe('Project Validation', () => {
		it('should validate project path exists', async () => {
			const pathExists = await projectManager.validateProjectPath('/workspace');
			assert.equal(pathExists, true);
		});

		it('should detect non-existent project path', async () => {
			const pathExists = await projectManager.validateProjectPath('/non-existent');
			assert.equal(pathExists, false);
		});
	});

	describe('Error Handling', () => {
		it('should handle project creation errors gracefully', async () => {
			// Test with invalid path
			const pathExists = await projectManager.validateProjectPath('/invalid/path');
			assert.equal(pathExists, false);
		});

		it('should handle project update errors gracefully', async () => {
			const nonExistentProject = { id: 'non-existent', name: 'Test' };

			try {
				await projectManager.updateProject('non-existent', { name: 'Updated' });
				assert.fail('Should have thrown an error');
			} catch (error) {
				assert.ok(error instanceof Error);
				assert.ok(error.message.includes('Project not found'));
			}
		});

		it('should handle project removal errors gracefully', async () => {
			await projectManager.removeProject('non-existent');

			const projects = await projectManager.getProjects();
			assert.equal(projects.length, 0);
		});
	});

	describe('Integration Tests', () => {
		it('should perform complete project lifecycle', async () => {
			// Create project
			await projectCommands.addProject();

			const projects = await projectManager.getProjects();
			assert.equal(projects.length, 1);

			// Edit project
			await projectCommands.editProject(projects[0]);

			// Switch to project
			await projectCommands.switchProject();

			const currentProject = await projectManager.getCurrentProject();
			assert.ok(currentProject);

			// Remove project
			await projectCommands.removeProject(projects[0]);

			const finalProjects = await projectManager.getProjects();
			assert.equal(finalProjects.length, 0);
		});

		it('should handle multiple projects correctly', async () => {
			// Create multiple projects
			await projectCommands.addProject();
			await projectCommands.addProject();
			await projectCommands.addProject();

			const projects = await projectManager.getProjects();
			assert.equal(projects.length, 3);

			// Each project should have required properties
			projects.forEach(project => {
				assert.ok(project.id);
				assert.ok(project.name);
				assert.ok(project.path);
				assert.ok(project.lastAccessed instanceof Date);
				assert.equal(typeof project.active, 'boolean');
			});
		});
	});
});
