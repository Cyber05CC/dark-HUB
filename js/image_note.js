import { app } from "/scripts/app.js";

const TARGET_CLASS = "darkHUB";
const API_BASE = "/darkhub/api";
const PLACEHOLDER_URL = `${API_BASE}/files/previews/placeholder.svg`;
const NODE_SIZE = [408, 868];
const UI_HEIGHT = 788;
const UI_MIN_HEIGHT = 620;
const UI_MAX_HEIGHT = 1600;

let lightbox = null;
const CONVERTED_TYPE = "converted-widget";

function injectStyles() {
    if (document.getElementById("darkhub-prompt-styles")) return;

    const style = document.createElement("style");
    style.id = "darkhub-prompt-styles";
    style.textContent = `
    @import url("https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600&display=swap");

    :root{
        --dh-text:#f7f7f7;
        --dh-muted:rgba(247,247,247,.62);
        --dh-muted-soft:rgba(247,247,247,.36);
        --dh-accent:rgb(99,102,241);
        --dh-accent-soft:rgba(99,102,241,.14);
        --dh-shell:#0f1420;
        --dh-card:#0d1320;
        --dh-card-soft:#111827;
        --dh-line:rgba(247,247,247,.055);
        --dh-shadow:0 14px 28px rgba(5,8,20,.18);
    }
    .dh-shell,
    .dh-shell *{
        font-family:"Poppins","Segoe UI",sans-serif;
    }
    .dh-shell{
        width:100%;
        height:100%;
        box-sizing:border-box;
        overflow:hidden;
        padding:12px;
        border-radius:24px;
        border:1px solid rgba(247,247,247,.04);
        background:
            radial-gradient(circle at top right,rgba(99,102,241,.08),transparent 30%),
            linear-gradient(180deg,#101624 0%,#0b1120 100%);
        color:var(--dh-text);
        display:flex;
        flex-direction:column;
        gap:10px;
        box-shadow:inset 0 1px 0 rgba(255,255,255,.02);
    }
    .dh-stage{
        width:100%;
        flex:1;
        min-height:0;
        border-radius:18px;
        border:1px solid var(--dh-line);
        background:linear-gradient(180deg,#0d1320 0%,#0c1220 100%);
        box-shadow:var(--dh-shadow);
        overflow:hidden;
        display:flex;
        flex-direction:column;
    }
    .dh-preview{
        width:100%;
        flex:1 1 auto;
        min-height:320px;
        padding:0;
        border:0;
        background:#0a0f19;
        display:block;
        cursor:pointer;
    }
    .dh-img{
        width:100%;
        height:100%;
        object-fit:cover;
        object-position:center top;
        display:block;
    }
    .dh-content{
        padding:14px 16px 12px;
        flex:0 0 152px;
        min-height:152px;
        max-height:152px;
        box-sizing:border-box;
        display:flex;
        flex-direction:column;
        gap:9px;
        overflow:hidden;
        background:linear-gradient(180deg,rgba(255,255,255,.012) 0%,rgba(255,255,255,.008) 100%);
    }
    .dh-prompt-wrap{
        position:relative;
        flex:1;
        min-height:0;
        overflow:hidden;
    }
    .dh-prompt-wrap::after{
        content:"";
        position:absolute;
        left:0;
        right:0;
        bottom:0;
        height:32px;
        pointer-events:none;
        background:linear-gradient(180deg,rgba(13,19,32,0) 0%,rgba(13,19,32,.08) 30%,rgba(13,19,32,.42) 76%,rgba(13,19,32,.84) 100%);
        box-shadow:inset 0 -14px 18px rgba(8,12,20,.2);
    }
    .dh-row{
        display:flex;
        align-items:flex-start;
        justify-content:space-between;
        gap:10px;
    }
    .dh-title{
        margin:0;
        flex:1;
        min-width:0;
        font-size:17px;
        line-height:1.28;
        font-weight:400;
        letter-spacing:-.015em;
        color:var(--dh-text);
        display:-webkit-box;
        -webkit-line-clamp:2;
        -webkit-box-orient:vertical;
        overflow:hidden;
    }
    .dh-copy,
    .dh-nav,
    .dh-lb-btn{
        border:0;
        font-family:inherit;
        transition:background .14s ease,border-color .14s ease,color .14s ease,transform .14s ease;
    }
    .dh-copy{
        flex:0 0 auto;
        min-height:26px;
        padding:0 11px;
        border-radius:999px;
        border:1px solid var(--dh-line);
        background:rgba(255,255,255,.022);
        color:var(--dh-muted);
        font-size:10px;
        font-weight:400;
        letter-spacing:.01em;
        cursor:pointer;
    }
    .dh-copy:hover,
    .dh-nav:hover,
    .dh-lb-btn:hover{
        transform:translateY(-1px);
    }
    .dh-copy:hover{
        background:rgba(255,255,255,.04);
        color:var(--dh-text);
    }
    .dh-prompt{
        margin:0;
        width:100%;
        height:100%;
        color:var(--dh-muted);
        font-size:11px;
        line-height:1.72;
        font-weight:400;
        white-space:pre-wrap;
        display:block;
        overflow-y:auto;
        overflow-x:hidden;
        overscroll-behavior:contain;
        padding:0 8px 18px 0;
        scrollbar-width:thin;
        scrollbar-color:rgba(99,102,241,.28) transparent;
    }
    .dh-prompt::-webkit-scrollbar{
        width:6px;
    }
    .dh-prompt::-webkit-scrollbar-track{
        background:transparent;
    }
    .dh-prompt::-webkit-scrollbar-thumb{
        border-radius:999px;
        background:rgba(99,102,241,.24);
    }
    .dh-prompt::-webkit-scrollbar-thumb:hover{
        background:rgba(99,102,241,.36);
    }
    .dh-footer{
        display:grid;
        grid-template-columns:1fr 1fr;
        gap:10px;
        padding:0 16px 14px;
        background:var(--dh-card);
        align-items:center;
    }
    .dh-footer-spacer{
        display:none;
    }
    .dh-telegram-wrap{
        flex:0 0 78px;
        min-height:78px;
        max-height:78px;
        padding:0 16px 14px;
        background:var(--dh-card);
        display:flex;
    }
    .dh-telegram-card{
        width:100%;
        height:64px;
        border:1px solid rgba(247,247,247,.04);
        border-radius:16px;
        background:linear-gradient(180deg,rgba(255,255,255,.018) 0%,rgba(255,255,255,.012) 100%);
        color:var(--dh-text);
        display:grid;
        grid-template-columns:36px 1fr auto;
        gap:12px;
        align-items:center;
        padding:10px 14px;
        cursor:pointer;
        box-shadow:inset 0 1px 0 rgba(255,255,255,.02);
    }
    .dh-telegram-card:hover{
        background:linear-gradient(180deg,rgba(255,255,255,.028) 0%,rgba(255,255,255,.016) 100%);
    }
    .dh-telegram-icon{
        width:36px;
        height:36px;
        border-radius:11px;
        background:rgba(99,102,241,.08);
        border:1px solid rgba(99,102,241,.12);
        display:flex;
        align-items:center;
        justify-content:center;
        color:rgba(247,247,247,.94);
    }
    .dh-telegram-icon svg{
        width:16px;
        height:16px;
        display:block;
    }
    .dh-telegram-info{
        min-width:0;
        display:flex;
        flex-direction:column;
        align-items:flex-start;
        justify-content:center;
        gap:4px;
    }
    .dh-telegram-title{
        color:var(--dh-text);
        font-size:14px;
        line-height:1.2;
        font-weight:400;
        letter-spacing:-.01em;
    }
    .dh-telegram-link{
        color:var(--dh-muted-soft);
        font-size:10px;
        line-height:1.2;
        font-weight:400;
        letter-spacing:.01em;
        white-space:nowrap;
        overflow:hidden;
        text-overflow:ellipsis;
    }
    .dh-telegram-arrow{
        color:var(--dh-muted-soft);
        font-size:14px;
        line-height:1;
        font-weight:400;
    }
    .dh-nav{
        width:100%;
        min-height:44px;
        border-radius:14px;
        border:1px solid var(--dh-line);
        background:rgba(255,255,255,.022);
        color:var(--dh-text);
        font-size:20px;
        font-weight:400;
        display:inline-flex;
        align-items:center;
        justify-content:center;
        cursor:pointer;
    }
    .dh-nav:hover{
        background:rgba(255,255,255,.036);
    }
    .dh-status{
        min-height:13px;
        padding:0 4px;
        color:var(--dh-muted-soft);
        font-size:10px;
        line-height:1.35;
        font-weight:400;
        opacity:1;
        transition:opacity .16s ease;
    }
    .dh-status.empty{
        opacity:0;
    }
    .dh-status.err{
        color:rgba(255,180,160,.92);
    }
    .dh-lb{
        position:fixed;
        inset:0;
        z-index:9999;
        display:none;
        align-items:center;
        justify-content:center;
        background:rgba(3,6,16,.9);
        backdrop-filter:blur(14px);
    }
    .dh-lb.open{
        display:flex;
    }
    .dh-lb-stage{
        width:min(1180px,calc(100vw - 92px));
        height:min(88vh,940px);
        display:flex;
        align-items:center;
        justify-content:center;
        position:relative;
    }
    .dh-lb-img{
        max-width:100%;
        max-height:100%;
        display:block;
        border-radius:18px;
        object-fit:contain;
        box-shadow:0 22px 56px rgba(0,0,0,.36);
    }
    .dh-lb-panel{
        position:absolute;
        left:50%;
        bottom:18px;
        transform:translateX(-50%);
        width:min(760px,calc(100% - 72px));
        padding:14px 16px;
        border-radius:16px;
        background:rgba(13,19,32,.82);
        border:1px solid var(--dh-line);
    }
    .dh-lb-head{
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:10px;
        margin-bottom:8px;
    }
    .dh-lb-title{
        margin:0;
        font-size:16px;
        font-weight:500;
        color:var(--dh-text);
    }
    .dh-lb-prompt{
        margin:0;
        color:var(--dh-muted);
        font-size:12px;
        line-height:1.65;
        font-weight:400;
        white-space:pre-wrap;
        max-height:28vh;
        overflow:auto;
    }
    .dh-lb-btn{
        position:absolute;
        z-index:2;
        min-width:40px;
        min-height:40px;
        padding:0 12px;
        border-radius:12px;
        border:1px solid var(--dh-line);
        background:rgba(255,255,255,.04);
        color:var(--dh-text);
        font-size:16px;
        font-weight:400;
        cursor:pointer;
    }
    .dh-lb-btn.close{
        top:20px;
        right:20px;
        border-radius:999px;
    }
    .dh-lb-btn.prev,
    .dh-lb-btn.next{
        top:50%;
        transform:translateY(-50%);
        width:42px;
        height:60px;
        padding:0;
        font-size:24px;
    }
    .dh-lb-btn.prev{left:20px}
    .dh-lb-btn.next{right:20px}`;

    document.head.appendChild(style);
}

const widget = (node, name) => node.widgets?.find((w) => w.name === name);
const value = (node, name, fallback = "") => widget(node, name)?.value ?? fallback;

function setWidget(node, name, next) {
    const target = widget(node, name);
    if (!target) return;
    target.value = next;
    target.callback?.(next);
}

function hideWidget(node, name) {
    const target = widget(node, name);
    if (!target) return;

    target.origType = target.type;
    target.origComputeSize = target.computeSize;
    target.origSerializeValue = target.serializeValue;
    target.computeSize = () => [0, -4];
    target.type = CONVERTED_TYPE;
    target.hidden = true;

    if (target.linkedWidgets) {
        for (const linked of target.linkedWidgets) {
            hideWidget(node, linked.name);
        }
    }
}

function removeSlots(node) {
    if (Array.isArray(node.inputs) && node.inputs.length) {
        node._darkhubOriginalInputs = node._darkhubOriginalInputs || node.inputs;
        node.inputs = [];
    }
    if (Array.isArray(node.outputs) && node.outputs.length) {
        node._darkhubOriginalOutputs = node._darkhubOriginalOutputs || node.outputs;
        node.outputs = [];
    }
}

function normalizeMessage(valueOrArray) {
    return Array.isArray(valueOrArray) ? (valueOrArray[0] ?? "") : (valueOrArray ?? "");
}

function currentItem(node) {
    const items = node._darkhub?.catalog?.items || [];
    const id = value(node, "prompt_id", "");
    return items.find((item) => item.id === id) || items[0] || null;
}

function currentIndex(node) {
    const items = node._darkhub?.catalog?.items || [];
    const id = value(node, "prompt_id", "");
    const index = items.findIndex((item) => item.id === id);
    return index >= 0 ? index : 0;
}

function setStatus(node, text, tone = "info") {
    const ui = node._darkhub;
    const el = ui?.statusEl;
    if (!ui || !el) return;

    if (ui.statusTimer) {
        window.clearTimeout(ui.statusTimer);
        ui.statusTimer = null;
    }

    el.textContent = text || "";
    el.classList.toggle("err", tone === "error");
    el.classList.toggle("empty", !text);

    if (text && tone !== "error") {
        ui.statusTimer = window.setTimeout(() => {
            el.textContent = "";
            el.classList.add("empty");
        }, 1600);
    }
}

function ensureLightbox() {
    if (lightbox) return lightbox;

    const overlay = document.createElement("div");
    overlay.className = "dh-lb";
    overlay.innerHTML = `
        <button class="dh-lb-btn close" data-act="close">x</button>
        <button class="dh-lb-btn prev" data-act="prev"><</button>
        <button class="dh-lb-btn next" data-act="next">></button>
        <div class="dh-lb-stage">
            <img class="dh-lb-img" alt="dark HUB preview">
            <div class="dh-lb-panel">
                <div class="dh-lb-head">
                    <h2 class="dh-lb-title">Prompt</h2>
                    <button class="dh-copy" data-act="copy">Copy</button>
                </div>
                <pre class="dh-lb-prompt"></pre>
            </div>
        </div>`;

    const state = {
        overlay,
        img: overlay.querySelector(".dh-lb-img"),
        title: overlay.querySelector(".dh-lb-title"),
        prompt: overlay.querySelector(".dh-lb-prompt"),
        node: null,
    };

    overlay.addEventListener("click", async (event) => {
        const action = event.target?.dataset?.act;
        if (!action && event.target !== overlay) return;

        if (action === "close" || event.target === overlay) {
            closeLightbox();
            return;
        }

        if (!state.node) return;

        if (action === "prev") {
            stepSelection(state.node, -1, true);
            return;
        }

        if (action === "next") {
            stepSelection(state.node, 1, true);
            return;
        }

        if (action === "copy") {
            try {
                await navigator.clipboard.writeText(currentItem(state.node)?.prompt || "");
                setStatus(state.node, "Prompt copied.");
            } catch {
                setStatus(state.node, "Clipboard access failed.", "error");
            }
        }
    });

    window.addEventListener("keydown", (event) => {
        if (!state.overlay.classList.contains("open")) return;
        if (event.key === "Escape") closeLightbox();
        if (event.key === "ArrowLeft" && state.node) stepSelection(state.node, -1, true);
        if (event.key === "ArrowRight" && state.node) stepSelection(state.node, 1, true);
    });

    document.body.appendChild(overlay);
    lightbox = state;
    return state;
}

function refreshLightbox(node) {
    if (!lightbox || lightbox.node !== node) return;

    const item = currentItem(node);
    if (!item) return;

    lightbox.img.src = item.preview_url || PLACEHOLDER_URL;
    lightbox.title.textContent = item.title || "Prompt";
    lightbox.prompt.textContent = item.prompt || "";
}

function openLightbox(node) {
    const box = ensureLightbox();
    box.node = node;
    refreshLightbox(node);
    box.overlay.classList.add("open");
}

function closeLightbox() {
    if (!lightbox) return;
    lightbox.overlay.classList.remove("open");
    lightbox.node = null;
}

function buildUi(node) {
    injectStyles();
    ensureLightbox();

    const shell = document.createElement("div");
    shell.className = "dh-shell";

    const stage = document.createElement("div");
    stage.className = "dh-stage";

    const preview = document.createElement("button");
    preview.className = "dh-preview";

    const img = document.createElement("img");
    img.className = "dh-img";
    img.alt = "Prompt preview";
    img.src = PLACEHOLDER_URL;
    preview.appendChild(img);
    stage.appendChild(preview);

    const content = document.createElement("div");
    content.className = "dh-content";

    const row = document.createElement("div");
    row.className = "dh-row";

    const title = document.createElement("h3");
    title.className = "dh-title";
    title.textContent = "Prompt";

    const copyBtn = document.createElement("button");
    copyBtn.className = "dh-copy";
    copyBtn.textContent = "Copy";

    row.append(title, copyBtn);

    const promptWrap = document.createElement("div");
    promptWrap.className = "dh-prompt-wrap";

    const prompt = document.createElement("p");
    prompt.className = "dh-prompt";

    promptWrap.appendChild(prompt);
    content.append(row, promptWrap);
    stage.appendChild(content);

    const footer = document.createElement("div");
    footer.className = "dh-footer";

    const prevBtn = document.createElement("button");
    prevBtn.className = "dh-nav";
    prevBtn.textContent = "<";

    const nextBtn = document.createElement("button");
    nextBtn.className = "dh-nav";
    nextBtn.textContent = ">";

    const footerSpacer = document.createElement("div");
    footerSpacer.className = "dh-footer-spacer";

    footer.append(prevBtn, footerSpacer, nextBtn);
    stage.appendChild(footer);

    shell.appendChild(stage);

    const status = document.createElement("div");
    status.className = "dh-status empty";
    shell.appendChild(status);

    shell.addEventListener("pointerdown", (event) => event.stopPropagation());
    shell.addEventListener("wheel", (event) => event.stopPropagation());

    const onDocumentPointerDown = () => {};
    document.addEventListener("pointerdown", onDocumentPointerDown);

    node._darkhub = {
        shell,
        img,
        title,
        prompt,
        copyBtn,
        preview,
        prevBtn,
        nextBtn,
        statusEl: status,
        statusTimer: null,
        catalog: null,
        onDocumentPointerDown,
    };

      const dom = node.addDOMWidget("darkhub_browser", "darkhub_browser", shell, {
          serialize: false,
          hideOnZoom: false,
          getMinHeight: () => UI_MIN_HEIGHT,
          getMaxHeight: () => UI_MAX_HEIGHT,
      });
      dom.element.style.width = "100%";
      dom.element.style.height = "100%";
      dom.element.style.minHeight = `${UI_MIN_HEIGHT}px`;
  }

function updateOptions(node, items = []) {
    const ui = node._darkhub;
    if (!ui) return;
    ui.catalog = { ...(ui.catalog || {}), items };
}

function applySelection(node, item) {
    const ui = node._darkhub;
    if (!item || !ui) return;

    setWidget(node, "prompt_id", item.id);
    setWidget(node, "fallback_prompt", item.prompt || "");

    ui.title.textContent = item.title || "Prompt";
    ui.prompt.textContent = item.prompt || "";
    ui.img.src = item.preview_url || PLACEHOLDER_URL;
    refreshLightbox(node);
    node.setDirtyCanvas(true, true);
}

function stepSelection(node, offset, updateLightbox = false) {
    const items = node._darkhub?.catalog?.items || [];
    if (!items.length) return;

    const nextIndex = (currentIndex(node) + offset + items.length) % items.length;
    applySelection(node, items[nextIndex]);
    if (updateLightbox) refreshLightbox(node);
}

async function loadCatalog(node) {
    const url = (value(node, "catalog_url", "") || "").trim();
    const mode = value(node, "sync_mode", "remote_first");
    const params = new URLSearchParams();

    if (url) params.set("catalog_url", url);
    params.set("sync_mode", mode);

    const response = await fetch(`${API_BASE}/catalog?${params.toString()}`);
    if (!response.ok) throw new Error(`Catalog API failed with ${response.status}`);

    const payload = await response.json();
    node._darkhub.catalog = payload;

    const effective = payload.requested_catalog_url || payload.default_catalog_url || value(node, "catalog_url", "");
    if (effective && effective !== value(node, "catalog_url", "")) {
        setWidget(node, "catalog_url", effective);
    }

    updateOptions(node, payload.items || []);
    applySelection(node, currentItem(node));

    if (payload.remote_error && !(payload.items || []).length) {
        setStatus(node, "Catalog unavailable.", "error");
    } else {
        setStatus(node, "");
    }
}

function bindEvents(node) {
    const ui = node._darkhub;
    if (!ui) return;

    ui.copyBtn.addEventListener("click", async (event) => {
        event.stopPropagation();
        try {
            await navigator.clipboard.writeText(currentItem(node)?.prompt || "");
            setStatus(node, "Prompt copied.");
        } catch {
            setStatus(node, "Clipboard access failed.", "error");
        }
    });

    ui.preview.addEventListener("click", () => openLightbox(node));
    ui.prevBtn.addEventListener("click", () => stepSelection(node, -1));
    ui.nextBtn.addEventListener("click", () => stepSelection(node, 1));
}

app.registerExtension({
    name: "comfy.darkhub.prompt.library",
    async beforeRegisterNodeDef(nodeType, nodeData) {
        if (nodeType.comfyClass !== TARGET_CLASS && nodeData.name !== TARGET_CLASS) return;

         const oldCreated = nodeType.prototype.onNodeCreated;
         nodeType.prototype.onNodeCreated = function () {
             const result = oldCreated?.apply(this, arguments);
             this.serialize_widgets = true;
            this.resizable = true;
            this.flags = { ...(this.flags || {}), resizable: true };
            if (Object.prototype.hasOwnProperty.call(this, "computeSize")) {
                delete this.computeSize;
            }

            removeSlots(this);

            hideWidget(this, "prompt_id");
            hideWidget(this, "catalog_url");
            hideWidget(this, "fallback_prompt");
            hideWidget(this, "sync_mode");

            buildUi(this);
            bindEvents(this);

            this.setSize?.(NODE_SIZE);
            this.size = NODE_SIZE;

            loadCatalog(this).catch((error) => {
                console.error("darkHUB catalog init error", error);
                setStatus(this, "Catalog error.", "error");
                this._darkhub.img.src = PLACEHOLDER_URL;
            });

            return result;
        };

         const oldConfigure = nodeType.prototype.onConfigure;
         nodeType.prototype.onConfigure = function () {
             const result = oldConfigure?.apply(this, arguments);
            this.resizable = true;
            this.flags = { ...(this.flags || {}), resizable: true };
            if (Object.prototype.hasOwnProperty.call(this, "computeSize")) {
                delete this.computeSize;
            }
             removeSlots(this);
             return result;
         };

        const oldExecuted = nodeType.prototype.onExecuted;
        nodeType.prototype.onExecuted = function (message) {
            oldExecuted?.apply(this, arguments);
            if (!this._darkhub) return;

            const prompt = normalizeMessage(message?.selected_prompt);
            const title = normalizeMessage(message?.selected_title);
            const previewUrl = normalizeMessage(message?.selected_preview_url);
            const promptId = normalizeMessage(message?.selected_prompt_id);
            const catalogUrl = normalizeMessage(message?.selected_catalog_url);

            if (promptId) setWidget(this, "prompt_id", promptId);
            if (catalogUrl) setWidget(this, "catalog_url", catalogUrl);

            if (prompt) {
                setWidget(this, "fallback_prompt", prompt);
                this._darkhub.prompt.textContent = prompt;
            }

            if (title) this._darkhub.title.textContent = title;
            if (previewUrl) this._darkhub.img.src = previewUrl;

            updateOptions(this, this._darkhub.catalog?.items || []);
            refreshLightbox(this);
        };
    },
});
