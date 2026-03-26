const PLACEHOLDER_URL = "../catalog/previews/placeholder.svg";
const LOCAL_CATALOG_URL = "../catalog/prompts.json";

const embeddedFallbackCatalog = {
    name: "dark HUB Prompt Catalog",
    version: "0.1.0",
    source_type: "embedded",
    items: [
        {
            id: "cinematic-portrait",
            title: "Cinematic Portrait",
            prompt: "cinematic close-up portrait of a confident young woman, soft window light, 85mm lens look, delicate skin texture, rich contrast, subtle film grain, dark teal background, refined styling, editorial beauty photography, ultra detailed, premium color grading",
            tags: ["portrait", "cinematic", "editorial"],
            preview_url: "../catalog/previews/cinematic-portrait.svg",
        },
        {
            id: "studio-product",
            title: "Studio Product Shot",
            prompt: "luxury perfume bottle on polished stone pedestal, clean studio setup, crisp rim light, warm reflections, controlled shadows, premium commercial product photography, centered composition, sharp materials, elegant advertising visual, ultra realistic",
            tags: ["product", "studio", "commercial"],
            preview_url: "../catalog/previews/studio-product.svg",
        },
        {
            id: "fashion-editorial",
            title: "Fashion Editorial",
            prompt: "high-fashion editorial model walking through a minimalist concrete corridor, tailored monochrome outfit, directional light, magazine cover energy, dynamic pose, premium fabric detail, shallow depth of field, contemporary luxury campaign aesthetic",
            tags: ["fashion", "editorial", "style"],
            preview_url: "../catalog/previews/fashion-editorial.svg",
        },
    ],
};

const elements = {
    catalogUrl: document.getElementById("catalogUrl"),
    syncButton: document.getElementById("syncButton"),
    promptSelect: document.getElementById("promptSelect"),
    modeSelect: document.getElementById("modeSelect"),
    copyButton: document.getElementById("copyButton"),
    previewImage: document.getElementById("previewImage"),
    sourceBadge: document.getElementById("sourceBadge"),
    promptTitle: document.getElementById("promptTitle"),
    promptText: document.getElementById("promptText"),
    tags: document.getElementById("tags"),
    status: document.getElementById("status"),
    prevButton: document.getElementById("prevButton"),
    nextButton: document.getElementById("nextButton"),
    syncBadge: document.getElementById("syncBadge"),
};

const state = {
    catalog: null,
    selectedId: "",
};

function setStatus(message) {
    elements.status.textContent = message || "";
}

function normalizeCatalogUrl(value) {
    const trimmed = (value || "").trim();
    if (!trimmed) {
        return "";
    }

    const blobMatch = trimmed.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+)$/);
    if (blobMatch) {
        const [, owner, repo, branch, path] = blobMatch;
        return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;
    }

    const repoMatch = trimmed.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?\/?$/);
    if (repoMatch) {
        const [, owner, repo] = repoMatch;
        return `https://raw.githubusercontent.com/${owner}/${repo}/main/catalog/prompts.json`;
    }

    return trimmed;
}

function resolveImageUrl(imageRef, sourceUrl) {
    const clean = (imageRef || "").trim();
    if (!clean) {
        return PLACEHOLDER_URL;
    }

    if (/^(https?:|data:|\/)/.test(clean)) {
        return clean;
    }

    if (sourceUrl && /^https?:/.test(sourceUrl)) {
        return new URL(clean, sourceUrl).toString();
    }

    return clean;
}

function normalizeCatalogPayload(payload, sourceUrl = "", sourceType = "local") {
    const rawItems = Array.isArray(payload) ? payload : (payload?.prompts || payload?.items || []);
    const meta = Array.isArray(payload) ? {} : (payload || {});

    return {
        name: meta.name || "dark HUB Prompt Catalog",
        version: meta.version || "",
        source_type: sourceType,
        source_url: sourceUrl,
        items: rawItems
            .filter((item) => item && typeof item === "object")
            .map((item, index) => ({
                id: (item.id || item.title || `prompt-${index + 1}`).toString().trim(),
                title: (item.title || item.name || `Prompt ${index + 1}`).toString().trim(),
                prompt: (item.prompt || item.text || "").toString(),
                tags: Array.isArray(item.tags) ? item.tags.map((tag) => String(tag)) : [],
                preview_url: resolveImageUrl(item.preview_url || item.image || item.image_url || "", sourceUrl),
            })),
    };
}

function renderTags(tags) {
    elements.tags.innerHTML = "";
    for (const tag of tags || []) {
        const pill = document.createElement("span");
        pill.className = "darkhub-tag";
        pill.textContent = tag;
        elements.tags.appendChild(pill);
    }
}

function getSelectedItem() {
    const items = state.catalog?.items || [];
    return items.find((item) => item.id === state.selectedId) || items[0] || null;
}

function updatePromptOptions() {
    const items = state.catalog?.items || [];
    elements.promptSelect.innerHTML = "";

    for (const item of items) {
        const option = document.createElement("option");
        option.value = item.id;
        option.textContent = item.title;
        option.selected = item.id === state.selectedId;
        elements.promptSelect.appendChild(option);
    }
}

function applySelection(item) {
    if (!item) {
        elements.promptTitle.textContent = "Prompt preview";
        elements.promptText.value = "";
        elements.previewImage.src = PLACEHOLDER_URL;
        renderTags([]);
        return;
    }

    state.selectedId = item.id;
    elements.promptSelect.value = item.id;
    elements.promptTitle.textContent = item.title;
    elements.promptText.value = item.prompt || "";
    elements.previewImage.src = item.preview_url || PLACEHOLDER_URL;
    renderTags(item.tags || []);
}

function updateSourceBadges() {
    const sourceType = (state.catalog?.source_type || "local").toUpperCase();
    elements.sourceBadge.textContent = sourceType;
    elements.syncBadge.textContent = `${sourceType} Source`;
}

async function loadLocalCatalog() {
    const response = await fetch(LOCAL_CATALOG_URL, { cache: "no-store" });
    if (!response.ok) {
        throw new Error(`Local catalog failed: ${response.status}`);
    }

    const payload = await response.json();
    return normalizeCatalogPayload(payload, LOCAL_CATALOG_URL, "local");
}

async function loadRemoteCatalog(url) {
    const normalizedUrl = normalizeCatalogUrl(url);
    if (!normalizedUrl) {
        throw new Error("Remote catalog URL is empty.");
    }

    const response = await fetch(normalizedUrl, { cache: "no-store" });
    if (!response.ok) {
        throw new Error(`Remote catalog failed: ${response.status}`);
    }

    const payload = await response.json();
    return normalizeCatalogPayload(payload, normalizedUrl, "remote");
}

async function syncCatalog(forceMode) {
    const mode = forceMode || elements.modeSelect.value;
    const remoteInput = normalizeCatalogUrl(elements.catalogUrl.value);
    let catalog = null;

    setStatus("Catalog syncing...");

    if (mode === "local_only") {
        try {
            catalog = await loadLocalCatalog();
            setStatus("Local catalog loaded.");
        } catch (error) {
            catalog = embeddedFallbackCatalog;
            setStatus(`Local file topilmadi. Embedded fallback ishladi: ${error.message}`);
        }
    } else if (mode === "remote_only") {
        catalog = await loadRemoteCatalog(remoteInput);
        setStatus("Remote catalog loaded.");
    } else {
        try {
            if (remoteInput) {
                catalog = await loadRemoteCatalog(remoteInput);
                setStatus("Remote catalog loaded.");
            } else {
                catalog = await loadLocalCatalog();
                setStatus("Local catalog loaded.");
            }
        } catch (error) {
            try {
                catalog = await loadLocalCatalog();
                setStatus(`Remote ishlamadi, local fallback ishladi: ${error.message}`);
            } catch {
                catalog = embeddedFallbackCatalog;
                setStatus(`Remote va local ishlamadi. Embedded fallback ishladi: ${error.message}`);
            }
        }
    }

    state.catalog = catalog;
    if (!state.selectedId || !catalog.items.some((item) => item.id === state.selectedId)) {
        state.selectedId = catalog.items[0]?.id || "";
    }

    updatePromptOptions();
    applySelection(getSelectedItem());
    updateSourceBadges();
}

function stepSelection(offset) {
    const items = state.catalog?.items || [];
    if (!items.length) {
        return;
    }

    const currentIndex = Math.max(0, items.findIndex((item) => item.id === state.selectedId));
    const nextIndex = (currentIndex + offset + items.length) % items.length;
    applySelection(items[nextIndex]);
}

async function copyPrompt() {
    try {
        await navigator.clipboard.writeText(elements.promptText.value || "");
        setStatus("Prompt copied to clipboard.");
    } catch (error) {
        setStatus(`Clipboard failed: ${error.message}`);
    }
}

function bindEvents() {
    elements.syncButton.addEventListener("click", () => {
        syncCatalog().catch((error) => setStatus(`Sync error: ${error.message}`));
    });

    elements.modeSelect.addEventListener("change", () => {
        syncCatalog(elements.modeSelect.value).catch((error) => setStatus(`Mode error: ${error.message}`));
    });

    elements.catalogUrl.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            event.preventDefault();
            syncCatalog().catch((error) => setStatus(`URL error: ${error.message}`));
        }
    });

    elements.promptSelect.addEventListener("change", () => {
        state.selectedId = elements.promptSelect.value;
        applySelection(getSelectedItem());
    });

    elements.prevButton.addEventListener("click", () => stepSelection(-1));
    elements.nextButton.addEventListener("click", () => stepSelection(1));
    elements.copyButton.addEventListener("click", copyPrompt);
}

function setDefaultUrl() {
    const repoRemote = "https://raw.githubusercontent.com/Cyber05CC/dark-HUB/main/catalog/prompts.json";
    elements.catalogUrl.value = repoRemote;
}

async function init() {
    setDefaultUrl();
    bindEvents();

    try {
        await syncCatalog("local_only");
    } catch (error) {
        state.catalog = embeddedFallbackCatalog;
        state.selectedId = embeddedFallbackCatalog.items[0]?.id || "";
        updatePromptOptions();
        applySelection(getSelectedItem());
        updateSourceBadges();
        setStatus(`Preview fallback loaded: ${error.message}`);
    }
}

init();
