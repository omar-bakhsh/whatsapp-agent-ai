const fs = require('fs');
const path = require('path');

const clientFilePath = path.join(__dirname, '..', 'node_modules', 'whatsapp-web.js', 'src', 'Client.js');

if (!fs.existsSync(clientFilePath)) {
    console.log('[patch-wwebjs] whatsapp-web.js not installed yet, skipping patch.');
    process.exit(0);
}

let content = fs.readFileSync(clientFilePath, 'utf8');

let modified = false;

// 1. Patch change:hasSynced and socket.hasSynced
if (!content.includes('socket.hasSynced')) {
    const target = "socket.on('change:hasSynced', () => {\n                    window.onAppStateHasSyncedEvent();\n                });";
    const replacement = `socket.on('change:hasSynced', () => {
                    window.onAppStateHasSyncedEvent();
                });
                if (socket.hasSynced) {
                    window.onAppStateHasSyncedEvent();
                }`;
    if (content.includes(target)) {
        content = content.replace(target, replacement);
        modified = true;
        console.log('[patch-wwebjs] Patched socket.hasSynced listener.');
    }
}

// 2. Patch attachEventListeners retry loop
if (!content.includes('attachRetries')) {
    const target = `await this.attachEventListeners();
                }
                /**
                 * Emitted when the client has initialized and is ready to receive messages.
                 * @event Client#ready
                 */
                this.emit(Events.READY);`;
    const replacement = `let attachRetries = 3;
                        while (attachRetries > 0) {
                            try {
                                await this.attachEventListeners();
                                break;
                            } catch (e) {
                                attachRetries--;
                                if (attachRetries === 0) throw e;
                                await new Promise((r) => setTimeout(r, 3000));
                            }
                        }
                    }
                    /**
                     * Emitted when the client has initialized and is ready to receive messages.
                     * @event Client#ready
                     */
                    this.emit(Events.READY);`;
    if (content.includes(target)) {
        content = content.replace(target, replacement);
        modified = true;
        console.log('[patch-wwebjs] Patched attachEventListeners retry loop.');
    }
}

// 3. Fallback on offline 100% progress
if (!content.includes('percent >= 100 && !hasSyncedFired')) {
    const target = `this.emit(Events.LOADING_SCREEN, percent, 'WhatsApp'); // Message is hardcoded as "WhatsApp" for now
                }`;
    const replacement = `this.emit(Events.LOADING_SCREEN, percent, 'WhatsApp'); // Message is hardcoded as "WhatsApp" for now
                }
                if (percent >= 100 && !hasSyncedFired) {
                    setTimeout(async () => {
                        if (!hasSyncedFired) {
                            try {
                                await this.pupPage.evaluate(() => {
                                    if (window.onAppStateHasSyncedEvent) {
                                        window.onAppStateHasSyncedEvent();
                                    }
                                });
                            } catch (e) {}
                        }
                    }, 2000);
                }`;
    if (content.includes(target)) {
        content = content.replace(target, replacement);
        modified = true;
        console.log('[patch-wwebjs] Patched 100% sync fallback.');
    }
}

if (modified) {
    fs.writeFileSync(clientFilePath, content, 'utf8');
    console.log('[patch-wwebjs] All patches applied successfully to Client.js!');
} else {
    console.log('[patch-wwebjs] Client.js already patched or no changes needed.');
}
