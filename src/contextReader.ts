import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'out', '.vscode-test']);

export async function readClaudeMd(workspaceRoot: string): Promise<string> {
	const filePath = vscode.Uri.file(path.join(workspaceRoot, 'CLAUDE.md'));
	try {
		const bytes = await vscode.workspace.fs.readFile(filePath);
		return Buffer.from(bytes).toString('utf8');
	} catch {
		return '';
	}
}

export function readOpenFile(editor: vscode.TextEditor | undefined): string {
	if (!editor) {
		return '';
	}
	return editor.document.getText();
}

export async function readFolderTree(workspaceRoot: string): Promise<string> {
	const lines: string[] = [];

	function walk(dir: string, prefix: string, depth: number): void {
		if (depth > 2) {
			return;
		}
		let entries: fs.Dirent[];
		try {
			entries = fs.readdirSync(dir, { withFileTypes: true });
		} catch {
			return;
		}
		entries.sort((a, b) => {
			// Directories first, then files
			if (a.isDirectory() && !b.isDirectory()) { return -1; }
			if (!a.isDirectory() && b.isDirectory()) { return 1; }
			return a.name.localeCompare(b.name);
		});
		for (const entry of entries) {
			if (entry.name.startsWith('.') && entry.name !== '.env') {
				continue;
			}
			if (entry.isDirectory()) {
				if (SKIP_DIRS.has(entry.name)) {
					continue;
				}
				lines.push(`${prefix}${entry.name}/`);
				walk(path.join(dir, entry.name), prefix + '  ', depth + 1);
			} else {
				lines.push(`${prefix}${entry.name}`);
			}
		}
	}

	walk(workspaceRoot, '', 1);
	return lines.join('\n');
}
