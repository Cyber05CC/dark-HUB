const PLACEHOLDER_URL = "./catalog/previews/placeholder.svg";
const LOCAL_CATALOG_URL = "./catalog/prompts.json";

const embeddedFallbackCatalog = {
    name: "dark HUB Prompt Catalog",
    source_type: "embedded",
    items: [
        {
            id: "cinematic-portrait",
            title: "Cinematic Portrait",
            prompt: "cinematic close-up portrait of a confident young woman, soft window light, 85mm lens look, delicate skin texture, rich contrast, subtle film grain, dark teal background, refined styling, editorial beauty photography, ultra detailed, premium color grading",
            tags: ["portrait", "cinematic", "editorial"],
            preview_url: "./catalog/previews/cinematic-portrait.svg",
        },
        {
            id: "studio-product",
            title: "Studio Product Shot",
            prompt: "luxury perfume bottle on polished stone pedestal, clean studio setup, crisp rim light, warm reflections, controlled shadows, premium commercial product photography, centered composition, sharp materials, elegant advertising visual, ultra realistic",
            tags: ["product", "studio", "commercial"],
            preview_url: "./catalog/previews/studio-product.svg",
        },
        {
            id: "fashion-editorial",
            title: "Fashion Editorial",
            prompt: "high-fashion editorial model walking through a minimalist concrete corridor, tailored monochrome outfit, directional light, magazine cover energy, dynamic pose, premium fabric detail, shallow depth of field, contemporary luxury campaign aesthetic",
            tags: ["fashion", "editorial", "style"],
            preview_url: "./catalog/previews/fashion-editorial.svg",
        },
    ],
};

const $ = {
    gallery: document.getElementById("gallery"),
    statusLine: document.getElementById("statusLine"),
    sourceChip: document.getElementById("sourceChip"),
    reloadButton: document.getElementById("reloadButton"),
    lightbox: document.getElementById("lightbox"),
    closeButton: document.getElementById("closeButton"),
    prevButton: document.getElementById("prevButton"),
    nextButton: document.getElementById("nextButton"),
    lightboxImage: document.getElementById("lightboxImage"),
    lightboxTitle: document.getElementById("lightboxTitle"),
    lightboxPrompt: document.getElementById("lightboxPrompt"),
    lightboxCopy: document.getElementById("lightboxCopy"),
};

const state = {
    catalog: null,
    activeIndex: 0,
};

function showStatus(message = "", tone = "info") {
    if (!message) {
        $.statusLine.textContent = "";
        $.statusLine.classList.add("hidden");
        return;
    }

    $.statusLine.textContent = message;
    $.statusLine.classList.remove("hidden");
    if (tone === "error") {
        $.statusLine.style.color = "rgba(255, 168, 145, 0.92)";
        $.statusLine.style.borderColor = "rgba(255, 110, 72, 0.22)";
        $.statusLine.style.background = "rgba(35, 16, 12, 0.76)";
    } else {
        $.statusLine.style.color = "rgba(255, 190, 90, 0.88)";
        $.statusLine.style.borderColor = "rgba(189, 135, 41, 0.2)";
        $.statusLine.style.background = "rgba(23, 25, 13, 0.68)";
    }
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
        source_type: sourceType,
        source_url: sourceUrl,
        items: rawItems
            .filter((item) => item && typeof item === "object")
            .map((item, index) => ({
                id: String(item.id || item.title || `prompt-${index + 1}`),
                title: String(item.title || item.name || `Prompt ${index + 1}`),
                prompt: String(item.prompt || item.text || ""),
                tags: Array.isArray(item.tags) ? item.tags.map((tag) => String(tag)) : [],
                preview_url: resolveImageUrl(item.preview_url || item.image || item.image_url || "", sourceUrl),
            })),
    };
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
    const normalized = normalizeCatalogUrl(url);
    if (!normalized) {
        throw new Error("Remote catalog URL is empty.");
    }

    const response = await fetch(normalized, { cache: "no-store" });
    if (!response.ok) {
        throw new Error(`Remote catalog failed: ${response.status}`);
    }

    const payload = await response.json();
    return normalizeCatalogPayload(payload, normalized, "remote");
}

function getQueryConfig() {
    const params = new URLSearchParams(window.location.search);
    return {
        catalogUrl: normalizeCatalogUrl(params.get("catalog_url") || ""),
        sourceMode: params.get("source") || "",
    };
}

function updateSourceChip() {
    const source = state.catalog?.source_type || "local";
    $.sourceChip.textContent = `${source} catalog`;
}

function copyPrompt(prompt) {
    return navigator.clipboard.writeText(prompt || "");
}

function cardMarkup(item, index) {
    const tags = (item.tags || []).slice(0, 2).map((tag) => `<span class="tag">${tag}</span>`).join("");
    const escapedTitle = item.title.replace(/"/g, "&quot;");
    const escapedPrompt = item.prompt.replace(/</g, "&lt;");

    return `
      <article class="card" data-index="${index}">
        <img src="${item.preview_url || PLACEHOLDER_URL}" alt="${escapedTitle}" loading="lazy" referrerpolicy="no-referrer">
        <div class="card-overlay">
          <h3 class="card-title">${item.title}</h3>
          <p class="card-prompt">${escapedPrompt}</p>
          <div class="card-actions">
            <div class="tag-row">${tags}</div>
            <button class="copy-button" data-copy-index="${index}">Copy</button>
          </div>
        </div>
      </article>
    `;
}

function renderGallery() {
    const items = state.catalog?.items || [];
    if (!items.length) {
        $.gallery.innerHTML = `<div class="empty">Catalog bo'sh. Yangi prompt itemlar qo'shing.</div>`;
        return;
    }

    $.gallery.innerHTML = items.map(cardMarkup).join("");
}

function getActiveItem() {
    return state.catalog?.items?.[state.activeIndex] || null;
}

function openLightbox(index) {
    const items = state.catalog?.items || [];
    if (!items.length) {
        return;
    }

    state.activeIndex = Math.max(0, Math.min(index, items.length - 1));
    const item = getActiveItem();
    if (!item) {
        return;
    }

    $.lightboxImage.src = item.preview_url || PLACEHOLDER_URL;
    $.lightboxTitle.textContent = item.title;
    $.lightboxPrompt.textContent = item.prompt || "";
    $.lightbox.classList.add("open");
    $.lightbox.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
}

function closeLightbox() {
    $.lightbox.classList.remove("open");
    $.lightbox.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
}

function stepLightbox(offset) {
    const items = state.catalog?.items || [];
    if (!items.length) {
        return;
    }

    state.activeIndex = (state.activeIndex + offset + items.length) % items.length;
    openLightbox(state.activeIndex);
}

async function loadCatalog() {
    const { catalogUrl, sourceMode } = getQueryConfig();

    try {
        if (catalogUrl || sourceMode === "remote") {
            state.catalog = await loadRemoteCatalog(catalogUrl);
            showStatus("Remote catalog loaded.");
        } else {
            state.catalog = await loadLocalCatalog();
            showStatus("");
        }
    } catch (remoteError) {
        try {
            state.catalog = await loadLocalCatalog();
            showStatus(`Remote source ishlamadi. Local fallback ishladi: ${remoteError.message}`);
        } catch (localError) {
            state.catalog = embeddedFallbackCatalog;
            showStatus(`Fallback preview ishladi: ${localError.message}`, "error");
        }
    }

    updateSourceChip();
    renderGallery();
}

function bindEvents() {
    $.reloadButton.addEventListener("click", () => {
        loadCatalog().catch((error) => showStatus(`Reload error: ${error.message}`, "error"));
    });

    $.gallery.addEventListener("click", async (event) => {
        const copyButton = event.target.closest("[data-copy-index]");
        if (copyButton) {
          event.stopPropagation();
          const index = Number(copyButton.getAttribute("data-copy-index"));
          const item = state.catalog?.items?.[index];
          if (!item) {
              return;
          }

          try {
              await copyPrompt(item.prompt);
              showStatus(`Copied: ${item.title}`);
          } catch (error) {
              showStatus(`Clipboard error: ${error.message}`, "error");
          }
          return;
        }

        const card = event.target.closest("[data-index]");
        if (!card) {
            return;
        }

        openLightbox(Number(card.getAttribute("data-index")));
    });

    $.closeButton.addEventListener("click", closeLightbox);
    $.prevButton.addEventListener("click", () => stepLightbox(-1));
    $.nextButton.addEventListener("click", () => stepLightbox(1));
    $.lightboxCopy.addEventListener("click", async () => {
        const item = getActiveItem();
        if (!item) {
            return;
        }

        try {
            await copyPrompt(item.prompt);
            showStatus(`Copied: ${item.title}`);
        } catch (error) {
            showStatus(`Clipboard error: ${error.message}`, "error");
        }
    });

    $.lightbox.addEventListener("click", (event) => {
        if (event.target === $.lightbox) {
            closeLightbox();
        }
    });

    window.addEventListener("keydown", (event) => {
        if (!$.lightbox.classList.contains("open")) {
            return;
        }

        if (event.key === "Escape") {
            closeLightbox();
        } else if (event.key === "ArrowLeft") {
            stepLightbox(-1);
        } else if (event.key === "ArrowRight") {
            stepLightbox(1);
        }
    });
}

bindEvents();
loadCatalog().catch((error) => showStatus(`Catalog error: ${error.message}`, "error"));
