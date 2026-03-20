import { app } from '../../scripts/app.js';

const TARGET_CLASS = 'darkHUB';
const STATIC_IMAGE = new URL('./darkHUBcreator.png', import.meta.url).href;

// Bo'shliq yo'q
const PAD = 0;
const TITLE_H = 32;

// Juda katta rasmlar uchun limit
const MAX_IMG_W = 390;
const MAX_IMG_H = 390;

// Placeholder
const PLACEHOLDER_W = 220;
const PLACEHOLDER_H = 220;

function fitContain(srcW, srcH, maxW, maxH) {
    const scale = Math.min(maxW / srcW, maxH / srcH, 1);
    return {
        w: Math.max(1, Math.round(srcW * scale)),
        h: Math.max(1, Math.round(srcH * scale)),
    };
}

function getWidget(node, name) {
    return node.widgets?.find((w) => w.name === name);
}

function hideWidget(node, name) {
    const w = getWidget(node, name);
    if (!w) return;
    w.type = 'hidden';
    w.hidden = true;
    w.computeSize = () => [0, 0];
}

function updateNodeSize(node) {
    if (!node._img || !node._img.naturalWidth || !node._img.naturalHeight) {
        const nodeW = PLACEHOLDER_W;
        const nodeH = TITLE_H + PLACEHOLDER_H;

        if (node.setSize) node.setSize([nodeW, nodeH]);
        else node.size = [nodeW, nodeH];

        node._drawW = PLACEHOLDER_W;
        node._drawH = PLACEHOLDER_H;
        return;
    }

    const fit = fitContain(node._img.naturalWidth, node._img.naturalHeight, MAX_IMG_W, MAX_IMG_H);

    node._drawW = fit.w;
    node._drawH = fit.h;

    // Endi hech qanday yon/past padding yo'q
    const nodeW = fit.w;
    const nodeH = TITLE_H + fit.h;

    if (node.setSize) node.setSize([nodeW, nodeH]);
    else node.size = [nodeW, nodeH];
}

app.registerExtension({
    name: 'comfy.darkhub.static_image.no_padding',

    async beforeRegisterNodeDef(nodeType, nodeData) {
        if (nodeType.comfyClass !== TARGET_CLASS) return;

        const onNodeCreated = nodeType.prototype.onNodeCreated;
        nodeType.prototype.onNodeCreated = function () {
            const r = onNodeCreated?.apply(this, arguments);

            this.serialize_widgets = true;
            this.resizable = false;

            this._img = null;
            this._imgLoaded = false;
            this._imgError = false;
            this._drawW = PLACEHOLDER_W;
            this._drawH = PLACEHOLDER_H;

            hideWidget(this, 'image_data');
            hideWidget(this, 'caption');
            hideWidget(this, 'box_width');
            hideWidget(this, 'box_height');

            updateNodeSize(this);

            this._img = new Image();

            this._img.onload = () => {
                this._imgLoaded = true;
                this._imgError = false;
                updateNodeSize(this);
                this.setDirtyCanvas(true, true);
            };

            this._img.onerror = (err) => {
                console.error('darkHUB image load error:', STATIC_IMAGE, err);
                this._imgLoaded = false;
                this._imgError = true;
                updateNodeSize(this);
                this.setDirtyCanvas(true, true);
            };

            this._img.src = STATIC_IMAGE;

            return r;
        };

        const onDrawBackground = nodeType.prototype.onDrawBackground;
        nodeType.prototype.onDrawBackground = function (ctx) {
            const r = onDrawBackground?.apply(this, arguments);

            const w = this._drawW || PLACEHOLDER_W;
            const h = this._drawH || PLACEHOLDER_H;

            // Rasm title bar tagidan boshlanadi
            const x = 0;
            const y = TITLE_H;

            ctx.save();

            if (this._img && this._imgLoaded && this._img.naturalWidth > 0) {
                // Hech qanday bo'shliqsiz
                ctx.drawImage(this._img, x, y, w, h);
            } else {
                ctx.fillStyle = '#05070d';
                ctx.fillRect(x, y, w, h);

                ctx.fillStyle = '#9aa4b2';
                ctx.font = '14px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(
                    this._imgError ? 'Rasm yuklanmadi' : 'Rasm yuklanmoqda...',
                    x + w / 2,
                    y + h / 2
                );
            }

            ctx.restore();
            return r;
        };
    },
});
