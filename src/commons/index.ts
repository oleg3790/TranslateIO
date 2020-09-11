import * as vscode from 'vscode';

export const STRING_VARIANCE_REGEX: RegExp = /['"']/g;
export const STRING_CONTENT_REGEX: RegExp = /["\"'"].+?["\"'"]/g;

export const getTranslationConfig = (): { from: string | undefined, to: string | undefined }  => {
	const config = vscode.workspace.getConfiguration('translateIO');
	return {
		to: config.get<string>('toLanguage'),
		from: config.get<string>('fromLanguage')
	};
};

export const informUserToHighlight = () => vscode.window.showInformationMessage('Highlight some text to translate');

export const getHighlightedRange = (): vscode.Range | null => {
	const currentEditor = vscode.window.activeTextEditor;
	const currentSelection = currentEditor?.selection;

	const start = currentSelection?.start;
	const end = currentSelection?.end;

	// If there is a selection range, parse
	if (start && end 
		&& (start.character !== end.character || start.line !== end.line)) {
		return new vscode.Range(start, end);
	}

	return null;
};

export const getHighlightedText = (): string | null => {
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

export const replaceHighlightedContent = (replaceWith: string): void => {
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

export const setupHighlightCommand = async (translateCallback: (highlightedText: string) => Promise<boolean>) => {
	try {
		const text = getHighlightedText();

		if (text) {
			const isSuccessful = await translateCallback(text);

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