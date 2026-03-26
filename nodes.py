from .catalog_service import (
    DEFAULT_SYNC_MODE,
    get_default_catalog_url,
    get_default_prompt_id,
    get_default_prompt_text,
    get_prompt_fingerprint,
    resolve_prompt,
)


class darkHUB:
    CATEGORY = "dark HUB"
    FUNCTION = "resolve"
    RETURN_TYPES = ("STRING", "STRING", "STRING")
    RETURN_NAMES = ("prompt", "title", "preview_url")
    OUTPUT_NODE = False

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "prompt_id": ("STRING", {"default": get_default_prompt_id()}),
                "catalog_url": ("STRING", {"default": get_default_catalog_url()}),
                "fallback_prompt": ("STRING", {"default": get_default_prompt_text(), "multiline": True}),
                "sync_mode": (["remote_first", "local_only", "remote_only"], {"default": DEFAULT_SYNC_MODE}),
            }
        }

    @classmethod
    def IS_CHANGED(cls, prompt_id, catalog_url, fallback_prompt, sync_mode):
        return get_prompt_fingerprint(prompt_id, catalog_url, fallback_prompt, sync_mode)

    def resolve(self, prompt_id, catalog_url, fallback_prompt, sync_mode):
        resolved = resolve_prompt(
            prompt_id=prompt_id,
            catalog_url=catalog_url,
            fallback_prompt=fallback_prompt,
            sync_mode=sync_mode,
            force_refresh=False,
        )

        prompt = resolved["prompt"]
        title = resolved["title"]
        preview_url = resolved["preview_url"]

        return {
            "ui": {
                "selected_prompt": [prompt],
                "selected_title": [title],
                "selected_preview_url": [preview_url],
                "selected_prompt_id": [resolved["id"]],
                "selected_source_type": [resolved.get("source_type", "local")],
                "selected_catalog_url": [resolved.get("effective_catalog_url", "")],
            },
            "result": (prompt, title, preview_url),
        }


NODE_CLASS_MAPPINGS = {
    "darkHUB": darkHUB,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "darkHUB": "dark HUB Prompt Library",
}
