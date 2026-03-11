# Prompt Enhancer

A VS Code sidebar extension that rewrites your raw instructions into clear, specific, and actionable prompts for [Claude Code](https://claude.ai/code) — using a local Ollama model so nothing leaves your machine.

---

## What It Does

1. You type a rough instruction in the sidebar (e.g. *"add login"*).
2. The extension gathers project context automatically:
   - your workspace folder tree (up to 2 levels deep)
   - `CLAUDE.md` conventions (if present)
   - the file currently open in the editor
3. It sends everything to a local Ollama model.
4. A polished, context-aware prompt appears in the sidebar — ready to paste into Claude Code.

---

## System Requirements

| Requirement | Minimum | Recommended |
|---|---|---|
| **OS** | Windows 10 64-bit | Windows 11 64-bit |
| **VS Code** | v1.85.0 | Latest stable |
| **Node.js** | v18 (build only) | v20 LTS |
| **RAM** | 8 GB | 16 GB |
| **Disk** | ~5 GB per model | SSD preferred |
| **GPU (NVIDIA)** | 6 GB VRAM | 8 GB+ VRAM |
| **GPU (Apple)** | M1 | M2 / M3 |

> **No GPU?** Ollama falls back to CPU automatically. Responses will be slower but fully functional.

---

## Recommended Models

| Model | Size | Best For |
|---|---|---|
| `llama3.1` | ~4.7 GB | Best quality — default recommendation |
| `mistral` | ~4.1 GB | Fast + smart, great alternative |
| `llama3.2` | ~2.0 GB | Fastest responses, lower quality |

---

## Prerequisites

### 1. Install Ollama

Download and install Ollama from [ollama.com](https://ollama.com), then start it:

```
ollama serve
```

Ollama runs as a local server on `http://localhost:11434` by default.

### 2. Pull a Model

```
ollama pull llama3.1
```

Replace `llama3.1` with any model from the table above. The first pull downloads the model weights (~2–5 GB).

---

## Configuration

Open **Settings** (`Ctrl+,`) and search for `promptEnhancer`.

| Setting | Default | Description |
|---|---|---|
| `promptEnhancer.ollamaUrl` | `http://localhost:11434` | Base URL of your Ollama instance |
| `promptEnhancer.model` | `llama3.1` | Model name to use for enhancement |

Changes take effect immediately — no extension reload required. The sidebar label **Using: &lt;model&gt;** updates automatically.

**Example — switching to Mistral:**

1. Open Settings (`Ctrl+,`)
2. Search for `promptEnhancer.model`
3. Set the value to `mistral`
4. The sidebar updates instantly

---

## Running Locally (Development)

> **Note:** To package the extension as a `.vsix` file, you need `vsce` installed globally:
> ```
> npm install -g @vscode/vsce
> ```
> This only needs to be done once. Once installed, `npm run package` will produce a `.vsix` you can share or install locally.

### 1. Clone and install dependencies

```
git clone <repo-url>
cd PromptAlchemy
npm install
```

### 2. Build the extension

```
npm run build
```

Or keep a watcher running during development:

```
npm run watch
```

### 3. Launch the Extension Development Host

Press **F5** in VS Code (or go to **Run › Start Debugging**).

A new **Extension Development Host** window opens with Prompt Enhancer active.

### 4. Open the sidebar

Click the **pencil/edit icon** in the Activity Bar (left panel) to open the Prompt Enhancer sidebar.

### 5. Enhance a prompt

1. Open a workspace folder (**File › Open Folder…**)
2. Type a rough instruction in the text area
3. Click **Enhance**
4. Click **Copy to Clipboard** to grab the result

---

## Troubleshooting

### Ollama not running

**Error:** *Could not reach Ollama at http://localhost:11434. Is it running?*

**Fix:**
1. Open a terminal and run `ollama serve`
2. Verify it responds: open `http://localhost:11434` in a browser — you should see `Ollama is running`
3. If you changed the port, update `promptEnhancer.ollamaUrl` in settings to match

---

### Wrong model name

**Error:** *Model 'xyz' not found in Ollama. Update promptEnhancer.model in settings.*

**Fix:**
1. List your locally available models: `ollama list`
2. Pull the model if missing: `ollama pull llama3.1`
3. Update `promptEnhancer.model` in VS Code settings to match the exact model name shown by `ollama list`

---

### No workspace open

**Message:** *Open a folder to use Prompt Enhancer.*

The extension reads your project structure to build context. It requires an open workspace folder.

**Fix:** Go to **File › Open Folder…** and open your project directory.

---

### Slow responses

Ollama is running on CPU instead of GPU.

**Fix (NVIDIA):** Ensure your NVIDIA drivers are up to date and that Ollama detects your GPU:

```
ollama run llama3.1
```

The first line of output indicates whether the GPU is being used.

**Alternatively:** Switch to a smaller, faster model like `llama3.2` (`ollama pull llama3.2`) and set `promptEnhancer.model` to `llama3.2`.
