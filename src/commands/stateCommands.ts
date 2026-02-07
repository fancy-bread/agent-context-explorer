// State Management Commands
import * as vscode from 'vscode';
import { StateSectionContentProvider } from '../providers/stateSectionContentProvider';
import { ComplianceReport, PillarResult } from '../scanner/types';

export class StateCommands {
	private static contentProvider: StateSectionContentProvider;
	private static outputChannel: vscode.OutputChannel | undefined;

	static registerCommands(context: vscode.ExtensionContext, contentProvider: StateSectionContentProvider): void {
		this.contentProvider = contentProvider;

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

		context.subscriptions.push(viewStateSection, auditAsdlc);
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
}
