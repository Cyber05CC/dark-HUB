class darkHUB:
    CATEGORY = "utils"
    FUNCTION = "run"
    RETURN_TYPES = ()

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "image_data": ("STRING", {"default": "", "multiline": True}),
            }
        }

    def run(self, image_data):
        return ()


NODE_CLASS_MAPPINGS = {
    "darkHUB": darkHUB,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "darkHUB": "dark HUB",
}