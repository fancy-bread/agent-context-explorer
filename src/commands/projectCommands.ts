// Project Management Commands
import * as vscode from 'vscode';
import { ProjectManager } from '../services/projectManager';
import { ProjectDefinition } from '../types/project';

export class ProjectCommands {
	static registerCommands(context: vscode.ExtensionContext): void {
		const projectManager = new ProjectManager(context);

		// Add Project command
		const addProject = vscode.commands.registerCommand('ace.addProject', async () => {
			try {
				// Get project name
				const name = await vscode.window.showInputBox({
					prompt: 'Project name',
					validateInput: (value) => {
						if (!value || value.trim().length === 0) {
							return 'Project name is required';
						}
						return null;
					}
				});
				if (!name) {return;}

				// Get project path
				const path = await vscode.window.showInputBox({
					prompt: 'Project path (absolute path to project directory)',
					validateInput: async (value) => {
						if (!value || value.trim().length === 0) {
							return 'Project path is required';
						}
						const isValid = await projectManager.validateProjectPath(value);
						if (!isValid) {
							return 'Path does not exist or is not a directory';
						}
						return null;
					}
				});
				if (!path) {return;}

				// Get optional description
				const description = await vscode.window.showInputBox({
					prompt: 'Project description (optional)',
					value: ''
				});

				// Add the project
				const project = await projectManager.addProject({
					name,
					path,
					description: description || undefined
				});

				vscode.window.showInformationMessage(`Project added: ${project.name}`);
			} catch (e: any) {
				vscode.window.showErrorMessage(`Failed to add project: ${e?.message || e}`);
			}
		});


		// Remove Project command
		const removeProject = vscode.commands.registerCommand('ace.removeProject', async (project: ProjectDefinition) => {
			try {
				const result = await vscode.window.showWarningMessage(
					`Are you sure you want to remove project "${project.name}"?`,
					'Yes', 'No'
				);

				if (result === 'Yes') {
					await projectManager.removeProject(project.id);
					vscode.window.showInformationMessage(`Project removed: ${project.name}`);

					// Refresh the tree view
					vscode.commands.executeCommand('ace.refresh');
				}
			} catch (e: any) {
				vscode.window.showErrorMessage(`Failed to remove project: ${e?.message || e}`);
			}
		});

		// Edit Project command
		const editProject = vscode.commands.registerCommand('ace.editProject', async (project: ProjectDefinition) => {
			try {
				// Get updated name
				const name = await vscode.window.showInputBox({
					prompt: 'Project name',
					value: project.name,
					validateInput: (value) => {
						if (!value || value.trim().length === 0) {
							return 'Project name is required';
						}
						return null;
					}
				});
				if (!name) {return;}

				// Get updated description
				const description = await vscode.window.showInputBox({
					prompt: 'Project description (optional)',
					value: project.description || ''
				});

				// Update the project
				await projectManager.updateProject(project.id, {
					name,
					description: description || undefined
				});

				vscode.window.showInformationMessage(`Project updated: ${name}`);

				// Refresh the tree view
				vscode.commands.executeCommand('ace.refresh');
			} catch (e: any) {
				vscode.window.showErrorMessage(`Failed to edit project: ${e?.message || e}`);
			}
		});

		// List Projects command
		const listProjects = vscode.commands.registerCommand('ace.listProjects', async () => {
			try {
				const projects = await projectManager.getProjects();
				const currentProject = await projectManager.getCurrentProject();

				if (projects.length === 0) {
					vscode.window.showInformationMessage('No projects defined');
					return;
				}

				const projectList = projects.map(p =>
					`${p.name}${p.id === currentProject?.id ? ' (current)' : ''}`
				).join('\n');

				const content = `# Project List

${projectList}

---
*Total: ${projects.length} projects*
*Current: ${currentProject?.name || 'None'}*
`;

				const doc = await vscode.workspace.openTextDocument({
					content,
					language: 'markdown'
				});
				await vscode.window.showTextDocument(doc);
			} catch (e: any) {
				vscode.window.showErrorMessage(`Failed to list projects: ${e?.message || e}`);
			}
		});

		context.subscriptions.push(addProject, removeProject, editProject, listProjects);
	}
}
