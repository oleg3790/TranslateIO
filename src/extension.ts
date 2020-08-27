import * as vscode from 'vscode';
const translate = require('@vitalets/google-translate-api');

const getHighlightedText = (): string | undefined => {
	const currentEditor = vscode.window.activeTextEditor;
	const currentSelection = currentEditor?.selection;

	const start = currentSelection?.start;
	const end = currentSelection?.end;

	// If there is a selection range, parse
	if (start && end && start.character !== end.character) {
		const selectionRange = new vscode.Range(start, end);
		const highlightedText = currentEditor?.document.getText(selectionRange);

		if (highlightedText) {
			return highlightedText;
		}
	}

	vscode.window.showInformationMessage('Highlight some text to translate');
};

const getTranslationConfig = (): { from: string | undefined, to: string | undefined }  => {
	const config = vscode.workspace.getConfiguration('translateio');
	return {
		to: config.get<string>('toLanguage'),
		from: config.get<string>('fromLanguage')
	};
};

const translateContent = async () => {
	try {
		const highlightedText = getHighlightedText();
		const config = getTranslationConfig();

		const result = await translate(highlightedText, { from: config.from, to: config.to });

		vscode.window.showInformationMessage(`Translated Successfully!`);
	} catch (ex) {
		vscode.window.showErrorMessage('Error encountered while attempting to translate content');
	}
};

export function activate(context: vscode.ExtensionContext) {

	let translateCommand = vscode.commands.registerCommand('translateio.translate', async () => translateContent());

	context.subscriptions.push(translateCommand);
}

export function deactivate() {}
