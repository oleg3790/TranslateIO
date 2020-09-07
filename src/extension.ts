import * as vscode from 'vscode';
const translate = require('@vitalets/google-translate-api');

const STRING_VARIANCE_REGEX: RegExp = /(')|(")/g;

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

const verifyStringsInHighlightedText = (highlightedText: string): boolean => {
	const stringVarianceMatches = highlightedText.match(STRING_VARIANCE_REGEX);

	if (stringVarianceMatches === null) {
		vscode.window.showErrorMessage('No strings found to translate');
		return false;
	}

	const counts = {
		singleQuote: 0,
		doubleQuote: 0
	};

	// Record each found quote char; we need to make sure there is an odd number of quotes
	stringVarianceMatches.forEach(sv => {
		switch (sv) {
			case "'":
				counts.singleQuote++;
				break;
			case '"':
				counts.doubleQuote++;
				break;
			default:
				return false;
		}
	});

	Object.values(counts).forEach(v => {
		if (v % 2 !== 0) {
			vscode.window.showErrorMessage('Strings in highlighted range require beginning and ending quotes');
			return false;
		}
	});

	return true;
};

const getTranslationConfig = (): { from: string | undefined, to: string | undefined }  => {
	const config = vscode.workspace.getConfiguration('translateIO');
	return {
		to: config.get<string>('toLanguage'),
		from: config.get<string>('fromLanguage')
	};
};

const setup = async (translateCallback: (highlightedText: string) => Promise<boolean>) => {
	try {
		const text = getHighlightedText();

		if (text) {
			var isSuccessful = await translateCallback(text);

			if (isSuccessful) {
				vscode.window.showInformationMessage('Translated Successfully!');
				return;
			}

			// Don't message when not successful, that's handled in the callback as it has more context on the work
			return;
		}

		informUserToHighlight();
	} catch (ex) {
		vscode.window.showErrorMessage('Error encountered while attempting to translate content');
	}
};

const translateAllAndReplace = async () =>
	setup(async (highlightedText) => {
		const config = getTranslationConfig();
		const result = await translate(highlightedText, { from: config.from, to: config.to });
		replaceHighlightedContent(result.text);
		return true;
	});

const translateStringsAndReplace = async () =>
	setup(async (highlightedText) => {
		var isVerified = verifyStringsInHighlightedText(highlightedText);
		
		if (isVerified) {

			return true;
		}

		return false;
	});

export function activate(context: vscode.ExtensionContext) {

	let translateAllReplaceCommand = vscode.commands.registerCommand('translateIO.translateAllReplace', async () => translateAllAndReplace());
	let translateStringsReplaceCommand = vscode.commands.registerCommand('translateIO.translateStringsReplace', async () => translateStringsAndReplace());

	context.subscriptions.push(translateAllReplaceCommand);
	context.subscriptions.push(translateStringsReplaceCommand);
}

export function deactivate() {}
