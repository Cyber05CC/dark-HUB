# darkHUB Prompt Library

`darkHUB Prompt Library` is a ComfyUI custom node pack that lets you browse curated prompts with preview images and keep prompt catalogs synced from a remote JSON source.

## Features

- One image-first prompt browser node for ComfyUI
- Workflow-portable prompt catalogs stored in `workflow.json`
- Remote catalog sync from a GitHub-hosted JSON file
- Local fallback prompts when the remote catalog is unavailable
- Minimal UI designed for quick prompt browsing and copy/paste workflows

## Included Node

- `dark HUB Prompt Library`
  Outputs:
  - `prompt`
  - `title`
  - `preview_url`

## Catalog Format

The remote catalog is a JSON file with this shape:

```json
{
  "name": "dark HUB Prompt Catalog",
  "version": "0.2.0",
  "updated_at": "2026-03-26T12:00:00Z",
  "prompts": [
    {
      "id": "fashion-editorial",
      "title": "Fashion Editorial",
      "prompt": "editorial fashion portrait, tailored styling, clean composition",
      "image": "previews/fashion-editorial.svg",
      "tags": ["fashion", "editorial"]
    }
  ]
}
```

Relative image paths are resolved from the catalog location, which makes GitHub raw catalogs easy to manage.

## Install

### Manual install

Clone this repository into your ComfyUI `custom_nodes` directory:

```bash
cd ComfyUI/custom_nodes
git clone https://github.com/Cyber05CC/dark-HUB.git
```

Install Python requirements:

```bash
pip install -r requirements.txt
```

Restart ComfyUI after installation.

### ComfyUI Manager

Once this repository is published to the Comfy Registry, it can be installed from the new ComfyUI Manager search UI as a node pack.

## Publishing to the Comfy Registry

This repository includes `.github/workflows/publish_action.yml` for automated registry publishing.

Required once per repository:

1. Create a publisher on the Comfy Registry.
2. Create a registry publishing API key for that publisher.
3. Add the API key to GitHub repository secrets as `REGISTRY_ACCESS_TOKEN`.
4. Bump the version in `pyproject.toml` and push to `main`.

## License

MIT
