import * as vscode from 'vscode';
import { setupHighlightCommand, replaceHighlightedContent, getTranslationConfig, STRING_CONTENT_REGEX,
        STRING_VARIANCE_REGEX } from '../commons';
const translate = require('@vitalets/google-translate-api');

export const translateStringsAndReplace = async () =>
    setupHighlightCommand(async (highlightedText) => {
		const isVerified = verifyStringsInHighlightedText(highlightedText);
		
		if (isVerified) {
			const result = await doTranslateStrings(highlightedText);
			replaceHighlightedContent(result);
			return true;
		}

		return false;
    });
    

export const doTranslateStrings = async (text: string): Promise<string> => {
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

export const verifyStringsInHighlightedText = (highlightedText: string): boolean => {
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