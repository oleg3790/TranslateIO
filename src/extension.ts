import * as vscode from 'vscode';
import { translateAllAndReplace, translateStringsAndReplace } from './commands';

export function activate(context: vscode.ExtensionContext) {

	let translateAllReplaceCommand = vscode.commands.registerCommand('translateIO.translateAllReplace', async () => translateAllAndReplace());
	let translateStringsReplaceCommand = vscode.commands.registerCommand('translateIO.translateStringsReplace', async () => translateStringsAndReplace());

	context.subscriptions.push(translateAllReplaceCommand);
	context.subscriptions.push(translateStringsReplaceCommand);
}

export function deactivate() {}
