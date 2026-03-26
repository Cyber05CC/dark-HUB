# ComfyUI darkHUB

`dark HUB Prompt Library` is a ComfyUI custom node for shipping ready-made prompts inside a clean image-first browser UI.

## What it does

- Shows a preview image on top and the matching prompt under it.
- Keeps the selected `prompt_id` and `catalog_url` inside the workflow.
- Loads prompt updates from a remote JSON file, so if you update `catalog/prompts.json` and `git push`, users can reopen the workflow and receive the latest prompt content.
- Falls back to the last saved prompt text inside the workflow if the remote source is unavailable.

## Online update flow

This repo is already wired for the GitHub raw file:

`https://raw.githubusercontent.com/Cyber05CC/dark-HUB/main/catalog/prompts.json`

That means the node can use this catalog pattern:

1. Share the workflow with the `dark HUB Prompt Library` node.
2. Later, edit [`catalog/prompts.json`](./catalog/prompts.json) and the preview assets in [`catalog/previews`](./catalog/previews).
3. Commit and push to GitHub.
4. When users reopen the workflow, the node syncs the latest prompt catalog from the remote raw JSON URL.

## Files you will usually edit

- [`catalog/prompts.json`](./catalog/prompts.json)
- [`catalog/previews`](./catalog/previews)

Each prompt item supports:

```json
{
  "id": "my-prompt-id",
  "title": "My Prompt",
  "prompt": "full prompt text here",
  "image": "previews/my-preview.svg",
  "tags": ["portrait", "editorial"]
}
```

For GitHub-hosted catalogs, relative image paths are resolved automatically next to the JSON file.

## Manager / Registry notes

This repo now includes:

- `pyproject.toml`
- `requirements.txt`
- version metadata for ComfyUI registry tools

To appear in the global ComfyUI Manager install/search list for everyone, the repo still needs to be published through the Comfy registry and/or added to the Manager node list channel.

## Browser preview

You can also preview the node UI in a normal browser.

Run:

```bash
E:\ComfyUI_windows_portable\python_embeded\python.exe browser_demo.py
```

Then open:

```text
http://127.0.0.1:8189/showcase.html
```

This opens the cleaner showcase-style browser UI with a dark gallery and full-screen image preview.
