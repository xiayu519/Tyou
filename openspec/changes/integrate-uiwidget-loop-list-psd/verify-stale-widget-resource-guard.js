const fs = require("fs");

function read(path) {
    return fs.readFileSync(path, "utf8");
}

function assertContains(path, pattern, message) {
    const content = read(path);
    if (!pattern.test(content)) {
        throw new Error(`${message}: ${path}`);
    }
}

assertContains(
    "Client/assets/ty-framework/module/loader/ResourceModule.ts",
    /isValidOwner\?\s*:\s*\(\)\s*=>\s*boolean/,
    "SetSpriteAsyncParams must expose owner validity guard"
);

assertContains(
    "Client/assets/ty-framework/module/loader/SpriteAssignService.ts",
    /this\._requestMap\.get\(params\.target\)\s*!==\s*requestId\s*\|\|\s*!this\.isOwnerValid\(params\)[\s\S]*this\.releaseLoadedSpriteFrame\(spriteFrame\)/,
    "SpriteAssignService must release stale owner sprite frames"
);

assertContains(
    "Client/assets/ty-framework/module/ui/UIBase.ts",
    /isValidOwner:\s*\(\)\s*=>\s*this\.isOwnerEpochValid\(ownerEpoch\)/,
    "UIBase sprite helpers must pass owner epoch guard"
);

assertContains(
    "Client/assets/ty-framework/module/ui/UIWidget.ts",
    /public recycle\([\s\S]*this\.recycleOwnerResources\(\)/,
    "UIWidget recycle must release owner resources"
);

assertContains(
    "Client/assets/ty-framework/module/ui/loop-list/ListView.ts",
    /this\._recycleItemWidget\(item\);[\s\S]*this\._pool\.put\(item\)/,
    "ListView must recycle item widget before pooling"
);

console.log("stale widget resource guard verification passed");
