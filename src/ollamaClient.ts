export class OllamaUnreachableError extends Error {
	constructor(public readonly url: string) {
		super(`Could not reach Ollama at ${url}`);
		this.name = 'OllamaUnreachableError';
	}
}

export class OllamaModelNotFoundError extends Error {
	constructor(public readonly model: string) {
		super(`Model '${model}' not found in Ollama`);
		this.name = 'OllamaModelNotFoundError';
	}
}

const SYSTEM_PROMPT =
	'You are an expert prompt engineer helping a developer communicate clearly with Claude Code, ' +
	'an AI coding assistant. Given the developer\'s raw instruction and project context, rewrite ' +
	'the prompt to be specific, unambiguous, and actionable. Reference relevant file names if they ' +
	'appear in the folder tree. Incorporate relevant conventions from CLAUDE.md if provided. ' +
	'Return only the enhanced prompt — no explanations, no preamble.';

export interface OllamaContext {
	claudeMd: string;
	openFile: string;
	folderTree: string;
}

interface OllamaResponse {
	response: string;
}

export async function enhancePrompt(
	rawPrompt: string,
	context: OllamaContext,
	ollamaUrl: string,
	model: string
): Promise<string> {
	const contextParts: string[] = [];

	if (context.folderTree) {
		contextParts.push(`## Project Structure\n\`\`\`\n${context.folderTree}\n\`\`\``);
	}
	if (context.claudeMd) {
		contextParts.push(`## CLAUDE.md\n${context.claudeMd}`);
	}
	if (context.openFile) {
		contextParts.push(`## Currently Open File\n\`\`\`\n${context.openFile}\n\`\`\``);
	}

	const userMessage = contextParts.length > 0
		? `${contextParts.join('\n\n')}\n\n## Raw Prompt\n${rawPrompt}`
		: rawPrompt;

	let response: Response;
	try {
		response = await fetch(`${ollamaUrl}/api/generate`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				model,
				system: SYSTEM_PROMPT,
				prompt: userMessage,
				stream: false,
			}),
		});
	} catch {
		throw new OllamaUnreachableError(ollamaUrl);
	}

	if (response.status === 404) {
		throw new OllamaModelNotFoundError(model);
	}

	if (!response.ok) {
		throw new Error(`Ollama request failed: ${response.status} ${response.statusText}`);
	}

	const data = await response.json() as OllamaResponse;
	return data.response.trim();
}
