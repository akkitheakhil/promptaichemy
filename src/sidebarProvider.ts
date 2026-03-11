import * as vscode from 'vscode';
import * as path from 'path';
import { readClaudeMd, readOpenFile, readFolderTree } from './contextReader';
import { enhancePrompt, OllamaUnreachableError, OllamaModelNotFoundError } from './ollamaClient';

export class SidebarProvider implements vscode.WebviewViewProvider {
	constructor(private readonly _extensionUri: vscode.Uri) {}

	resolveWebviewView(webviewView: vscode.WebviewView): void {
		webviewView.webview.options = {
			enableScripts: true,
			localResourceRoots: [this._extensionUri],
		};

		const render = () => {
			webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
		};
		render();

		// Re-render HTML when config changes so model label stays current
		const configListener = vscode.workspace.onDidChangeConfiguration((e) => {
			if (e.affectsConfiguration('promptEnhancer')) {
				const model = this._currentModel();
				const hasWorkspace = this._hasWorkspace();
				webviewView.webview.postMessage({ command: 'updateState', model, hasWorkspace });
			}
		});

		// Re-render when workspace folders change
		const workspaceListener = vscode.workspace.onDidChangeWorkspaceFolders(() => {
			render();
		});

		webviewView.onDidDispose(() => {
			configListener.dispose();
			workspaceListener.dispose();
		});

		webviewView.webview.onDidReceiveMessage(async (message) => {
			switch (message.command) {
				case 'enhance':
					await this._handleEnhance(webviewView.webview, message.prompt as string);
					break;
				case 'copy':
					await vscode.env.clipboard.writeText(message.text as string);
					break;
			}
		});
	}

	private _currentModel(): string {
		return vscode.workspace
			.getConfiguration('promptEnhancer')
			.get<string>('model', 'llama3.1');
	}

	private _currentUrl(): string {
		return vscode.workspace
			.getConfiguration('promptEnhancer')
			.get<string>('ollamaUrl', 'http://localhost:11434');
	}

	private _hasWorkspace(): boolean {
		return (vscode.workspace.workspaceFolders?.length ?? 0) > 0;
	}

	private async _handleEnhance(webview: vscode.Webview, rawPrompt: string): Promise<void> {
		// Read config fresh at click time
		const ollamaUrl = this._currentUrl();
		const model = this._currentModel();

		const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? '';

		const [claudeMd, folderTree] = await Promise.all([
			workspaceRoot ? readClaudeMd(workspaceRoot) : Promise.resolve(''),
			workspaceRoot ? readFolderTree(workspaceRoot) : Promise.resolve(''),
		]);
		const openFile = readOpenFile(vscode.window.activeTextEditor);

		try {
			const result = await enhancePrompt(
				rawPrompt,
				{ claudeMd, openFile, folderTree },
				ollamaUrl,
				model
			);
			webview.postMessage({ command: 'result', text: result });
		} catch (err) {
			let userMessage: string;

			if (err instanceof OllamaUnreachableError) {
				userMessage = `Could not reach Ollama at ${ollamaUrl}. Is it running? Check your promptEnhancer.ollamaUrl setting.`;
				vscode.window.showErrorMessage(userMessage);
			} else if (err instanceof OllamaModelNotFoundError) {
				userMessage = `Model '${model}' not found in Ollama. Update promptEnhancer.model in settings.`;
				vscode.window.showErrorMessage(userMessage);
			} else {
				userMessage = err instanceof Error ? err.message : String(err);
				vscode.window.showErrorMessage(`Prompt Enhancer: ${userMessage}`);
			}

			webview.postMessage({ command: 'error', text: userMessage });
		}
	}

	private _getHtmlForWebview(webview: vscode.Webview): string {
		const mainScriptUri = webview.asWebviewUri(
			vscode.Uri.file(path.join(this._extensionUri.fsPath, 'media', 'main.js'))
		);
		const nonce = getNonce();
		const model = this._currentModel();
		const hasWorkspace = this._hasWorkspace();

		return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy"
    content="default-src 'none'; script-src 'nonce-${nonce}'; style-src 'unsafe-inline';" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Prompt Enhancer</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
      background: var(--vscode-sideBar-background);
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--vscode-descriptionForeground);
      display: block;
      margin-bottom: 4px;
    }

    textarea {
      width: 100%;
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border: 1px solid var(--vscode-input-border, transparent);
      border-radius: 3px;
      padding: 6px 8px;
      font-family: inherit;
      font-size: inherit;
      resize: vertical;
      outline: none;
      line-height: 1.5;
    }
    textarea:focus {
      border-color: var(--vscode-focusBorder);
    }
    textarea:disabled {
      opacity: 0.5;
    }

    #prompt-input { min-height: 100px; }

    .btn {
      width: 100%;
      padding: 6px 12px;
      border: none;
      border-radius: 3px;
      cursor: pointer;
      font-family: inherit;
      font-size: inherit;
      transition: background 0.1s;
    }
    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    #enhance-btn {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
    }
    #enhance-btn:hover:not(:disabled) {
      background: var(--vscode-button-hoverBackground);
    }

    #model-label {
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
      text-align: center;
      margin-top: -4px;
    }

    #no-workspace-banner {
      display: none;
      background: var(--vscode-inputValidation-warningBackground);
      border: 1px solid var(--vscode-inputValidation-warningBorder);
      color: var(--vscode-inputValidation-warningForeground, var(--vscode-foreground));
      border-radius: 3px;
      padding: 8px 10px;
      font-size: 12px;
      line-height: 1.4;
    }

    #status {
      display: none;
      font-size: 12px;
      color: var(--vscode-descriptionForeground);
      font-style: italic;
    }

    #status.is-error {
      color: var(--vscode-inputValidation-errorForeground, var(--vscode-errorForeground));
      font-style: normal;
    }

    #result-area {
      display: none;
      flex-direction: column;
      gap: 6px;
    }

    #result-text {
      background: var(--vscode-editor-background);
      color: var(--vscode-editor-foreground);
      border: 1px solid var(--vscode-input-border, transparent);
      border-radius: 3px;
      padding: 8px;
      white-space: pre-wrap;
      word-break: break-word;
      font-family: var(--vscode-editor-font-family, monospace);
      font-size: var(--vscode-editor-font-size, 12px);
      line-height: 1.5;
      min-height: 80px;
      max-height: 280px;
      overflow-y: auto;
    }

    #copy-btn {
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
    }
    #copy-btn:hover:not(:disabled) {
      background: var(--vscode-button-secondaryHoverBackground);
    }
  </style>
</head>
<body>
  <div id="no-workspace-banner">
    Open a folder to use Prompt Enhancer.
  </div>

  <div>
    <label for="prompt-input">Raw Prompt</label>
    <textarea id="prompt-input" placeholder="Type your instruction here…" rows="6"></textarea>
  </div>

  <button id="enhance-btn" class="btn">Enhance</button>
  <div id="model-label">Using: ${escapeHtml(model)}</div>

  <span id="status"></span>

  <div id="result-area">
    <label>Enhanced Prompt</label>
    <div id="result-text"></div>
    <button id="copy-btn" class="btn">Copy to Clipboard</button>
  </div>

  <script nonce="${nonce}">
    window.__INIT__ = ${JSON.stringify({ model, hasWorkspace })};
  </script>
  <script nonce="${nonce}" src="${mainScriptUri}"></script>
</body>
</html>`;
	}
}

function getNonce(): string {
	let text = '';
	const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	for (let i = 0; i < 32; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}

function escapeHtml(str: string): string {
	return str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}
