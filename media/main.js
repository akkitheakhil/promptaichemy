// @ts-check
(function () {
	const vscode = acquireVsCodeApi();

	/** @type {{ model: string, hasWorkspace: boolean }} */
	const init = window.__INIT__;

	const promptInput    = /** @type {HTMLTextAreaElement} */ (document.getElementById('prompt-input'));
	const enhanceBtn     = /** @type {HTMLButtonElement}  */ (document.getElementById('enhance-btn'));
	const modelLabel     = /** @type {HTMLElement}        */ (document.getElementById('model-label'));
	const noWorkspace    = /** @type {HTMLElement}        */ (document.getElementById('no-workspace-banner'));
	const resultArea     = /** @type {HTMLElement}        */ (document.getElementById('result-area'));
	const resultText     = /** @type {HTMLElement}        */ (document.getElementById('result-text'));
	const copyBtn        = /** @type {HTMLButtonElement}  */ (document.getElementById('copy-btn'));
	const statusEl       = /** @type {HTMLElement}        */ (document.getElementById('status'));

	// ── state ────────────────────────────────────────────────────────────────

	let inFlight = false;

	function applyWorkspaceState(hasWorkspace) {
		noWorkspace.style.display = hasWorkspace ? 'none' : 'block';
		enhanceBtn.disabled = !hasWorkspace || inFlight;
		promptInput.disabled = !hasWorkspace;
		if (!hasWorkspace) {
			promptInput.placeholder = '';
		} else {
			promptInput.placeholder = 'Type your instruction here…';
		}
	}

	function setModel(model) {
		modelLabel.textContent = `Using: ${model}`;
	}

	function setStatus(msg, isError = false) {
		statusEl.textContent = msg;
		statusEl.style.display = msg ? 'block' : 'none';
		statusEl.classList.toggle('is-error', isError);
	}

	function setLoading(loading) {
		inFlight = loading;
		enhanceBtn.disabled = loading || !init.hasWorkspace;
		enhanceBtn.textContent = loading ? 'Enhancing…' : 'Enhance';
		if (loading) {
			setStatus('Calling Ollama, please wait…');
		} else if (!statusEl.classList.contains('is-error')) {
			setStatus('');
		}
	}

	function clearResult() {
		resultArea.style.display = 'none';
		resultText.textContent = '';
	}

	// ── init ─────────────────────────────────────────────────────────────────

	setModel(init.model);
	applyWorkspaceState(init.hasWorkspace);

	// ── events ────────────────────────────────────────────────────────────────

	promptInput.addEventListener('input', () => {
		if (resultText.textContent) {
			clearResult();
		}
		setStatus('');
	});

	enhanceBtn.addEventListener('click', () => {
		const prompt = promptInput.value.trim();
		if (!prompt) {
			setStatus('Please enter a prompt first.', true);
			return;
		}
		clearResult();
		setLoading(true);
		vscode.postMessage({ command: 'enhance', prompt });
	});

	copyBtn.addEventListener('click', () => {
		const text = resultText.textContent || '';
		vscode.postMessage({ command: 'copy', text });
		copyBtn.textContent = 'Copied!';
		setTimeout(() => { copyBtn.textContent = 'Copy to Clipboard'; }, 1500);
	});

	// ── messages from extension host ─────────────────────────────────────────

	window.addEventListener('message', (event) => {
		const msg = event.data;
		switch (msg.command) {
			case 'result':
				setLoading(false);
				setStatus('');
				resultText.textContent = msg.text;
				resultArea.style.display = 'flex';
				break;

			case 'error':
				setLoading(false);
				// Error notification was already shown via vscode.window.showErrorMessage;
				// show a brief inline hint without duplicating the full message.
				setStatus('Enhancement failed. See the notification for details.', true);
				break;

			case 'updateState':
				init.hasWorkspace = msg.hasWorkspace;
				setModel(msg.model);
				applyWorkspaceState(msg.hasWorkspace);
				break;
		}
	});
}());
