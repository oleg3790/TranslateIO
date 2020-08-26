import * as vscode from 'vscode';
const translate = require('@vitalets/google-translate-api');

export function activate(context: vscode.ExtensionContext) {

	let translateCommand = vscode.commands.registerCommand('translateio.translate', async () => {

		const currentEditor = vscode.window.activeTextEditor;
		const currentSelection = currentEditor?.selection;

		const start = currentSelection?.start;
		const end = currentSelection?.end;

		// If there is a selection range, parse
		if (start && end && start.character !== end.character) {
			const selectionRange = new vscode.Range(start, end);
			const highlightedText = currentEditor?.document.getText(selectionRange);

			if (highlightedText) {
				const config = vscode.workspace.getConfiguration('translateio');

				try {
					const result = await translate(highlightedText, { from: config.get<string>('fromLanguage'), to: config.get<string>('toLanguage') });
					vscode.window.showInformationMessage(`Translated From: ${highlightedText} - To: ${result.text}`);
					return;
				} catch (ex) {
					console.error(ex);
				}
			}
		}

		vscode.window.showInformationMessage('Highlight a range to use in the translation, TranslateIO will parse the strings in this range');
	});

	context.subscriptions.push(translateCommand);
}

export function deactivate() {}
