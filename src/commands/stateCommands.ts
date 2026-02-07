// State Management Commands
import * as vscode from 'vscode';
import { StateSectionContentProvider } from '../providers/stateSectionContentProvider';

export class StateCommands {
	private static contentProvider: StateSectionContentProvider;

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

		context.subscriptions.push(viewStateSection);
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
