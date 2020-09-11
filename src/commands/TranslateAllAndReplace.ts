import { setupHighlightCommand, getTranslationConfig, replaceHighlightedContent } from '../commons';
const translate = require('@vitalets/google-translate-api');

export const translateAllAndReplace = async () =>
    setupHighlightCommand(async (highlightedText) => {
		const config = getTranslationConfig();
		const result = await translate(highlightedText, { ...config });
		replaceHighlightedContent(result.text);
		return true;
	});