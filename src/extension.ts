import * as vscode from 'vscode';
const translate = require('@vitalets/google-translate-api');

const STRING_VARIANCE_REGEX: RegExp = /['"']/g;
const STRING_CONTENT_REGEX: RegExp = /["\"'"].+?["\"'"]/g;

const informUserToHighlight = () => vscode.window.showInformationMessage('Highlight some text to translate');

const getHighlightedRange = (): vscode.Range | null => {
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
	const config = vscode.workspace.getConfiguration('translateIO');
	return {
		to: config.get<string>('toLanguage'),
		from: config.get<string>('fromLanguage')
	};
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

const doTranslateStrings = async (text: string): Promise<string> => {
	const stringMatches = text.match(STRING_CONTENT_REGEX);
	let translatedText = text;

	if (stringMatches) {
		for (let i = 0; i < stringMatches.length; i++) {
			const config = getTranslationConfig();
			let content = stringMatches[i];

			// Strip out quotes before passing content to translate
			const firstQuoteChar = content.match(/^./)?.[0];
			const lastQuoteChar = content.match(/.$/)?.[0];
			content = content.substr(1, content.length - 2);

			const result = await translate(content, { ...config });
			let translateResult: string = result.text;

			// Escape any quote chars that are found in the translation result
			if (translateResult.match(firstQuoteChar as string)) {
				translateResult = translateResult.replace(firstQuoteChar as string, `\\${firstQuoteChar}`);
			}

			// Add back quotes on replace
			translatedText = translatedText.replace(
				`${firstQuoteChar}${content}${lastQuoteChar}`,
				`${firstQuoteChar}${translateResult}${lastQuoteChar}`);
		}

		return translatedText;
	}
	
	throw new Error('No string content found');
};

const setup = async (translateCallback: (highlightedText: string) => Promise<boolean>) => {
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

const translateAllAndReplace = async () =>
	setup(async (highlightedText) => {
		const config = getTranslationConfig();
		const result = await translate(highlightedText, { ...config });
		replaceHighlightedContent(result.text);
		return true;
	});

const translateStringsAndReplace = async () =>
	setup(async (highlightedText) => {
		const isVerified = verifyStringsInHighlightedText(highlightedText);
		
		if (isVerified) {
			const result = await doTranslateStrings(highlightedText);
			replaceHighlightedContent(result);
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
