import * as vscode from 'vscode';
const translate = require('@vitalets/google-translate-api');

const informUserToHighlight = () => vscode.window.showInformationMessage('Highlight some text to translate');

const getHighlightedRange = (): vscode.Range | null => {
	const currentEditor = vscode.window.activeTextEditor;
	const currentSelection = currentEditor?.selection;

	const start = currentSelection?.start;
	const end = currentSelection?.end;

	// If there is a selection range, parse
	if (start && end && start.character !== end.character) {
		return new vscode.Range(start, end);
	}

	return null;
};

const getHighlightedText = (): string | null => {
	const currentEditor = vscode.window.activeTextEditor;
	const highlightedRange = getHighlightedRange();

	if (highlightedRange) {
		const highlightedText = currentEditor?.document.getText(highlightedRange);

		if (highlightedText) {
			return highlightedText;
		}
	}

	return null;
};

const replaceHighlightedContent = (replaceWith: string): void => {
	const highlightedRange = getHighlightedRange();

	if (highlightedRange) {
		const currentEditor = vscode.window.activeTextEditor;
		
		currentEditor?.edit(editBuilder => {
			editBuilder.replace(highlightedRange, replaceWith);
		});

		return;
	}

	// If we get here, throw
	throw new Error('No highlight range could be determined');
};

const getTranslationConfig = (): { from: string | undefined, to: string | undefined }  => {
	const config = vscode.workspace.getConfiguration('translateio');
	return {
		to: config.get<string>('toLanguage'),
		from: config.get<string>('fromLanguage')
	};
};

const translateAllAndReplace = async () => {
	try {
		const highlightedText = getHighlightedText();

		if (highlightedText) {
			const config = getTranslationConfig();
			const result = await translate(highlightedText, { from: config.from, to: config.to });
			replaceHighlightedContent(result.text);
			vscode.window.showInformationMessage(`Translated Successfully!`);
			return;
		}

		informUserToHighlight();
	} catch (ex) {
		vscode.window.showErrorMessage('Error encountered while attempting to translate content');
	}
};

export function activate(context: vscode.ExtensionContext) {

	let translateAllReplaceCommand = vscode.commands.registerCommand('translateIO.translateAllReplace', async () => translateAllAndReplace());

	context.subscriptions.push(translateAllReplaceCommand);
}

export function deactivate() {}
