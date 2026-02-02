// State Management Commands
import * as vscode from 'vscode';
import { ProjectState } from '../scanner/stateScanner';
import { StateSectionContentProvider } from '../providers/stateSectionContentProvider';
import { ComplianceReport, PillarResult } from '../scanner/types';

export class StateCommands {
	private static contentProvider: StateSectionContentProvider;
	private static outputChannel: vscode.OutputChannel | undefined;

	static registerCommands(context: vscode.ExtensionContext, contentProvider: StateSectionContentProvider): void {
		this.contentProvider = contentProvider;
		// Scan State command
		const scanState = vscode.commands.registerCommand('ace.scanState', async () => {
			try {
				const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri;
				if (!workspaceRoot) {
					vscode.window.showErrorMessage('No workspace folder found');
					return;
				}

				const { StateScanner } = await import('../scanner/stateScanner');
				const scanner = new StateScanner(workspaceRoot);
				const state = await scanner.scanState();

				vscode.window.showInformationMessage(
					`Project state scanned: ${state.frameworks.length} frameworks, ${state.configuration.length} config files, ${state.architecture.length} architecture patterns, ${state.documentation.length} documentation files`
				);
			} catch (e: any) {
				vscode.window.showErrorMessage(`Failed to scan state: ${e?.message || e}`);
			}
		});

		// View State command
		const viewState = vscode.commands.registerCommand('ace.viewState', async () => {
			try {
				const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri;
				if (!workspaceRoot) {
					vscode.window.showErrorMessage('No workspace folder found');
					return;
				}

				const { StateScanner } = await import('../scanner/stateScanner');
				const scanner = new StateScanner(workspaceRoot);
				const state = await scanner.scanState();

			// Create a formatted view of the project state
			const content = this.generateStateMarkdown(state);

				const doc = await vscode.workspace.openTextDocument({
					content,
					language: 'markdown'
				});
				await vscode.window.showTextDocument(doc);
			} catch (e: any) {
				vscode.window.showErrorMessage(`Failed to view state: ${e?.message || e}`);
			}
		});

		// Export State command
		const exportState = vscode.commands.registerCommand('ace.exportState', async () => {
			try {
				const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri;
				if (!workspaceRoot) {
					vscode.window.showErrorMessage('No workspace folder found');
					return;
				}

				const { StateScanner } = await import('../scanner/stateScanner');
				const scanner = new StateScanner(workspaceRoot);
				const state = await scanner.scanState();

				// Create JSON export
				const exportData = {
					timestamp: new Date().toISOString(),
					workspace: vscode.workspace.name || 'Unknown',
					state
				};

				const content = JSON.stringify(exportData, null, 2);

				const doc = await vscode.workspace.openTextDocument({
					content,
					language: 'json'
				});
				await vscode.window.showTextDocument(doc);

				vscode.window.showInformationMessage('Project state exported to new document');
			} catch (e: any) {
				vscode.window.showErrorMessage(`Failed to export state: ${e?.message || e}`);
			}
		});

		// View State Section command - opens individual state sections in a view
		const viewStateSection = vscode.commands.registerCommand(
			'ace.viewStateSection',
			async (sectionKey: string, sectionData: any, project: any) => {
				try {
					const content = this.generateStateSectionMarkdown(sectionKey, sectionData, project);

					// Use content provider for read-only display (no save prompts)
					const uri = StateSectionContentProvider.createUri(sectionKey, project.name);
					this.contentProvider.setContent(uri, content);

					const doc = await vscode.workspace.openTextDocument(uri);
					await vscode.window.showTextDocument(doc, { preview: true });
				} catch (e: any) {
					vscode.window.showErrorMessage(`Failed to view state section: ${e?.message || e}`);
				}
			}
		);

		// Audit ASDLC Compliance command
		const auditAsdlc = vscode.commands.registerCommand('ace.auditAsdlc', async () => {
			try {
				const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri;
				if (!workspaceRoot) {
					vscode.window.showErrorMessage('No workspace folder found');
					return;
				}

				// Show progress while auditing
				await vscode.window.withProgress({
					location: vscode.ProgressLocation.Notification,
					title: 'Running ASDLC Compliance Audit...',
					cancellable: false
				}, async () => {
					const { AsdlcComplianceScanner } = await import('../scanner/asdlcComplianceScanner');
					const scanner = new AsdlcComplianceScanner(workspaceRoot);
					const report = await scanner.audit();

					// Display results in output panel
					this.displayComplianceReport(report);
				});
			} catch (e: any) {
				vscode.window.showErrorMessage(`Failed to run ASDLC audit: ${e?.message || e}`);
			}
		});

		context.subscriptions.push(scanState, viewState, exportState, viewStateSection, auditAsdlc);
	}

	/**
	 * Display compliance report in output panel
	 */
	private static displayComplianceReport(report: ComplianceReport): void {
		// Create or get output channel
		if (!this.outputChannel) {
			this.outputChannel = vscode.window.createOutputChannel('ASDLC Compliance');
		}

		const output = this.outputChannel;
		output.clear();
		output.show();

		// Header
		const statusEmoji = report.overallStatus === 'pass' ? '✅' : report.overallStatus === 'warn' ? '⚠️' : '❌';
		output.appendLine('═══════════════════════════════════════════════════════════════');
		output.appendLine(`  ASDLC COMPLIANCE AUDIT REPORT  ${statusEmoji}`);
		output.appendLine('═══════════════════════════════════════════════════════════════');
		output.appendLine('');
		output.appendLine(`Project: ${report.projectPath}`);
		output.appendLine(`Time: ${new Date(report.timestamp).toLocaleString()}`);
		output.appendLine(`Overall Status: ${report.overallStatus.toUpperCase()}`);
		output.appendLine('');

		// Pillars
		for (const pillar of report.pillars) {
			this.displayPillarResult(output, pillar);
		}

		// Recommendations
		if (report.recommendations.length > 0) {
			output.appendLine('───────────────────────────────────────────────────────────────');
			output.appendLine('  RECOMMENDATIONS');
			output.appendLine('───────────────────────────────────────────────────────────────');
			output.appendLine('');
			for (const rec of report.recommendations) {
				output.appendLine(`  • ${rec}`);
			}
			output.appendLine('');
		}

		output.appendLine('═══════════════════════════════════════════════════════════════');
		output.appendLine('');

		// Show summary notification
		const passCount = report.pillars.filter(p => p.status === 'pass').length;
		const totalCount = report.pillars.length;

		if (report.overallStatus === 'pass') {
			vscode.window.showInformationMessage(`ASDLC Compliance: All ${totalCount} pillars passed ✅`);
		} else if (report.overallStatus === 'warn') {
			vscode.window.showWarningMessage(`ASDLC Compliance: ${passCount}/${totalCount} pillars passed, some warnings ⚠️`);
		} else {
			vscode.window.showErrorMessage(`ASDLC Compliance: ${passCount}/${totalCount} pillars passed ❌`);
		}
	}

	/**
	 * Display a single pillar result
	 */
	private static displayPillarResult(output: vscode.OutputChannel, pillar: PillarResult): void {
		const pillarNames: Record<string, string> = {
			'factory-architecture': 'PILLAR 1: FACTORY ARCHITECTURE',
			'standardized-parts': 'PILLAR 2: STANDARDIZED PARTS',
			'quality-control': 'PILLAR 3: QUALITY CONTROL'
		};

		output.appendLine('───────────────────────────────────────────────────────────────');
		output.appendLine(`  ${pillarNames[pillar.pillar]}`);
		output.appendLine('───────────────────────────────────────────────────────────────');
		output.appendLine(`  ${pillar.summary}`);
		output.appendLine('');

		for (const check of pillar.checks) {
			const statusIcon = check.status === 'pass' ? '✓' : check.status === 'warn' ? '⚠' : '✗';
			const statusColor = check.status === 'pass' ? '' : check.status === 'warn' ? '' : '';
			output.appendLine(`  [${statusIcon}] ${check.name}`);
			output.appendLine(`      ${check.message}`);

			if (check.details && check.details.length > 0) {
				for (const detail of check.details) {
					output.appendLine(`        - ${detail}`);
				}
			}
			output.appendLine('');
		}
	}

	/**
	 * Generate markdown for individual state section
	 */
	private static generateStateSectionMarkdown(sectionKey: string, sectionData: any, project: any): string {
		const sections: string[] = [];

		sections.push(`# ${sectionData.name}`);
		sections.push('');
		sections.push(`**Project**: ${project.name}`);
		sections.push('');
		sections.push('---');
		sections.push('');

		// Format the items
		sectionData.items.forEach((item: string) => {
			if (item === '') {
				sections.push('');
			} else if (item.startsWith('  •') || item.startsWith('  ⚠️')) {
				sections.push(item);
			} else {
				sections.push(`- ${item}`);
			}
		});

		sections.push('');
		sections.push('---');
		sections.push(`*Generated on ${new Date().toLocaleString()}*`);

		return sections.join('\n');
	}

	/**
	 * Generate comprehensive markdown for state (aligned with export)
	 */
	private static generateStateMarkdown(state: ProjectState): string {
		const sections: string[] = [];

		sections.push('# Project State Analysis');
		sections.push('');
		sections.push('> This view shows the same comprehensive state information that AI agents receive in exports.');
		sections.push('');

		// === ENHANCED STATE ===
		if (state.identity || state.capabilities || state.enhancedArchitecture ||
		    state.enhancedDependencies || state.platformContext || state.agentGuidance) {
			sections.push('## 🎯 Enhanced State Detection');
			sections.push('');
		}

		// Project Identity
		if (state.identity) {
			sections.push('### Project Identity');
			sections.push(`- **Type**: ${state.identity.projectType}`);
			sections.push(`- **Domain**: ${state.identity.domain}`);
			sections.push(`- **Primary Language**: ${state.identity.primaryLanguage}`);
			sections.push(`- **Maturity Level**: ${state.identity.maturityLevel}`);
			sections.push('');
		}

		// Capabilities
		if (state.capabilities) {
			sections.push('### Capabilities');
			if (state.capabilities.description) {
				sections.push(`**Description**: ${state.capabilities.description}`);
				sections.push('');
			}
			if (state.capabilities.primaryFeatures && state.capabilities.primaryFeatures.length > 0) {
				sections.push('**Primary Features**:');
				state.capabilities.primaryFeatures.forEach((f: string) => sections.push(`- ${f}`));
				sections.push('');
			}
			if (state.capabilities.dataFormats && state.capabilities.dataFormats.length > 0) {
				sections.push(`**Data Formats**: ${state.capabilities.dataFormats.join(', ')}`);
				sections.push('');
			}
		}

		// Enhanced Dependencies
		if (state.enhancedDependencies) {
			sections.push('### Dependencies by Purpose');

			if (state.enhancedDependencies.criticalPath && state.enhancedDependencies.criticalPath.length > 0) {
				sections.push(`**🔴 Critical Path**: ${state.enhancedDependencies.criticalPath.join(', ')}`);
				sections.push('');
			}

			const categories = [
				{ key: 'parsing', label: 'Parsing' },
				{ key: 'testing', label: 'Testing' },
				{ key: 'build', label: 'Build' },
				{ key: 'platform', label: 'Platform' },
				{ key: 'code-quality', label: 'Code Quality' },
				{ key: 'utility', label: 'Utility' },
				{ key: 'http', label: 'HTTP' },
				{ key: 'framework', label: 'Framework' }
			];

			for (const cat of categories) {
				const deps = (state.enhancedDependencies.byPurpose as any)[cat.key];
				if (deps && deps.length > 0) {
					sections.push(`**${cat.label}**:`);
					deps.forEach((dep: any) => {
						const critical = dep.critical ? ' 🔴' : '';
						sections.push(`- ${dep.name} (${dep.version})${critical} - ${dep.purpose}`);
					});
					sections.push('');
				}
			}
		}

		// Enhanced Architecture
		if (state.enhancedArchitecture) {
			sections.push('### Architecture');
			sections.push(`- **Style**: ${state.enhancedArchitecture.style}`);
			sections.push(`- **Organization**: ${state.enhancedArchitecture.organization}`);
			if (state.enhancedArchitecture.entryPoints && state.enhancedArchitecture.entryPoints.length > 0) {
				sections.push(`- **Entry Points**: ${state.enhancedArchitecture.entryPoints.join(', ')}`);
			}
			if (state.enhancedArchitecture.patterns && state.enhancedArchitecture.patterns.length > 0) {
				sections.push('');
				sections.push('**Design Patterns**:');
				state.enhancedArchitecture.patterns.forEach((p: string) => sections.push(`- ${p}`));
			}
			sections.push('');
		}

		// Platform Context
		if (state.platformContext?.vscode) {
			const vscode = state.platformContext.vscode;
			sections.push('### VS Code Platform Context');
			sections.push(`- **Extension Type**: ${vscode.extensionType}`);
			sections.push(`- **Category**: ${vscode.category}`);
			sections.push(`- **Minimum Version**: ${vscode.minVersion}`);
			sections.push('');
			sections.push('**Contributions**:');
			sections.push(`- Commands: ${vscode.contributes.commands}`);
			sections.push(`- Views: ${vscode.contributes.views}`);
			sections.push(`- Configuration: ${vscode.contributes.configuration}`);
			sections.push(`- Menus: ${vscode.contributes.menus}`);
			if (vscode.capabilities && vscode.capabilities.length > 0) {
				sections.push('');
				sections.push('**Capabilities**:');
				vscode.capabilities.forEach((c: string) => sections.push(`- ${c}`));
			}
			sections.push('');
		}

		// Agent Guidance
		if (state.agentGuidance) {
			sections.push('### 🤖 Agent Guidance');
			sections.push('');
			sections.push('**Suggested Approach**:');
			sections.push(`> ${state.agentGuidance.suggestedApproach}`);
			sections.push('');

			if (state.agentGuidance.criticalFiles && state.agentGuidance.criticalFiles.length > 0) {
				sections.push('**Critical Files**:');
				state.agentGuidance.criticalFiles.forEach((f: string) => sections.push(`- ${f}`));
				sections.push('');
			}

			if (state.agentGuidance.commonTasks && state.agentGuidance.commonTasks.length > 0) {
				sections.push('**Common Tasks**:');
				state.agentGuidance.commonTasks.forEach((t: string) => sections.push(`- ${t}`));
				sections.push('');
			}

			if (state.agentGuidance.watchOuts && state.agentGuidance.watchOuts.length > 0) {
				sections.push('**⚠️ Watch Outs**:');
				state.agentGuidance.watchOuts.forEach((w: string) => sections.push(`- ${w}`));
				sections.push('');
			}
		}

		// === BASIC STATE ===
		sections.push('---');
		sections.push('');
		sections.push('## Technology Stack');
		sections.push('');

		sections.push(`### Languages (${state.languages.length})`);
		sections.push(state.languages.length > 0 ? state.languages.map((l: string) => `- ${l}`).join('\n') : 'No languages detected');
		sections.push('');

		sections.push(`### Frameworks (${state.frameworks.length})`);
		sections.push(state.frameworks.length > 0 ? state.frameworks.map((f: string) => `- ${f}`).join('\n') : 'No frameworks detected');
		sections.push('');

		// === DEVELOPMENT ENVIRONMENT ===
		sections.push('## Development Environment');
		sections.push('');

		sections.push(`### Build Tools (${state.buildTools.length})`);
		sections.push(state.buildTools.length > 0 ? state.buildTools.map((b: string) => `- ${b}`).join('\n') : 'No build tools detected');
		sections.push('');

		sections.push(`### Testing (${state.testing.length})`);
		sections.push(state.testing.length > 0 ? state.testing.map((t: string) => `- ${t}`).join('\n') : 'No testing frameworks detected');
		sections.push('');

		sections.push(`### Code Quality (${state.codeQuality.length})`);
		sections.push(state.codeQuality.length > 0 ? state.codeQuality.map((c: string) => `- ${c}`).join('\n') : 'No code quality tools detected');
		sections.push('');

		sections.push(`### Development Tools (${state.developmentTools.length})`);
		sections.push(state.developmentTools.length > 0 ? state.developmentTools.map((d: string) => `- ${d}`).join('\n') : 'No development tools detected');
		sections.push('');

		// === PROJECT STRUCTURE ===
		sections.push('## Project Structure');
		sections.push('');

		sections.push(`### Architecture (${state.architecture.length})`);
		sections.push(state.architecture.length > 0 ? state.architecture.map((a: string) => `- ${a}`).join('\n') : 'No architecture patterns detected');
		sections.push('');

		sections.push(`### Configuration (${state.configuration.length})`);
		sections.push(state.configuration.length > 0 ? state.configuration.map((c: string) => `- ${c}`).join('\n') : 'No configuration files found');
		sections.push('');

		sections.push(`### Documentation (${state.documentation.length})`);
		sections.push(state.documentation.length > 0 ? state.documentation.map((d: string) => `- ${d}`).join('\n') : 'No documentation found');
		sections.push('');

		// === CONDITIONAL SECTIONS ===
		if (state.infrastructure) {
			const infra = state.infrastructure;
			const hasContent = infra.databases.length > 0 || infra.cache.length > 0 ||
			                   infra.queues.length > 0 || infra.storage.length > 0 ||
			                   infra.messaging.length > 0;

			if (hasContent) {
				sections.push('## Infrastructure');
				sections.push('');
				if (infra.databases.length > 0) {
					sections.push('**Databases**:');
					infra.databases.forEach((d: string) => sections.push(`- ${d}`));
					sections.push('');
				}
				if (infra.cache.length > 0) {
					sections.push('**Cache**:');
					infra.cache.forEach((c: string) => sections.push(`- ${c}`));
					sections.push('');
				}
				if (infra.queues.length > 0) {
					sections.push('**Queues**:');
					infra.queues.forEach((q: string) => sections.push(`- ${q}`));
					sections.push('');
				}
				if (infra.storage.length > 0) {
					sections.push('**Storage**:');
					infra.storage.forEach((s: string) => sections.push(`- ${s}`));
					sections.push('');
				}
				if (infra.messaging.length > 0) {
					sections.push('**Messaging**:');
					infra.messaging.forEach((m: string) => sections.push(`- ${m}`));
					sections.push('');
				}
			}
		}

		if (state.security) {
			const sec = state.security;
			const hasContent = sec.authFrameworks.length > 0 || sec.encryption.length > 0 ||
			                   sec.vulnerabilityScanning.length > 0 || sec.secretsManagement.length > 0;

			if (hasContent) {
				sections.push('## Security');
				sections.push('');
				if (sec.authFrameworks.length > 0) {
					sections.push('**Authentication Frameworks**:');
					sec.authFrameworks.forEach((a: string) => sections.push(`- ${a}`));
					sections.push('');
				}
				if (sec.encryption.length > 0) {
					sections.push('**Encryption**:');
					sec.encryption.forEach((e: string) => sections.push(`- ${e}`));
					sections.push('');
				}
				if (sec.vulnerabilityScanning.length > 0) {
					sections.push('**Vulnerability Scanning**:');
					sec.vulnerabilityScanning.forEach((v: string) => sections.push(`- ${v}`));
					sections.push('');
				}
				if (sec.secretsManagement.length > 0) {
					sections.push('**Secrets Management**:');
					sec.secretsManagement.forEach((s: string) => sections.push(`- ${s}`));
					sections.push('');
				}
			}
		}

		if (state.projectMetrics) {
			sections.push('## Project Metrics');
			sections.push('');
			sections.push(`- **Estimated Size**: ${state.projectMetrics.estimatedSize}`);
			sections.push(`- **Complexity**: ${state.projectMetrics.complexity}`);
			sections.push(`- **Files Analyzed**: ${state.projectMetrics.filesAnalyzed}`);
			sections.push(`- **Last Analyzed**: ${new Date(state.projectMetrics.lastAnalyzed).toLocaleString()}`);
			sections.push('');
		}

		// Footer
		sections.push('---');
		sections.push(`*Generated on ${new Date().toLocaleString()}*`);
		sections.push('');
		sections.push('> 💡 **Tip**: This state information is also available to AI agents via the export feature.');

		return sections.join('\n');
	}
}
