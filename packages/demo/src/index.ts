import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import {AutoTypings, LocalStorageCache} from 'monaco-editor-auto-typings';
import {editorContents} from './editorContents';

import './style.css';

const editor = monaco.editor.create(document.getElementById('editor-mountpoint')!, {
    model: monaco.editor.createModel(editorContents, 'typescript' /*Uri.parse('file://root/index.ts')*/),
});

const cache = new LocalStorageCache();


AutoTypings.create(editor, {
    // Cache declaration files to local storage
    sourceCache: cache,
    versions: {
        "@wix/sdk": "latest",
        "@wix/sdk-react": "latest",
        "@wix/dashboard": "latest",
        "@wix/api-client": "latest", // Deprecated
        "@wix/activity-counters": "latest",
        "@wix/auth-management": "latest",
        "@wix/blog": "latest",
        "@wix/bookings": "latest",
        "@wix/business-tools": "latest",
        "@wix/captcha": "latest",
        "@wix/comments": "latest",
        "@wix/crm": "latest",
        "@wix/data": "latest",
        "@wix/ecom": "latest",
        "@wix/email-marketing": "latest",
        "@wix/events": "latest",
        "@wix/forms": "latest",
        "@wix/forum": "latest",
        "@wix/groups": "latest",
        "@wix/inbox": "latest",
        "@wix/loyalty": "latest",
        "@wix/marketing": "latest",
        "@wix/marketing-tags": "latest",
        "@wix/media": "latest",
        "@wix/members": "latest",
        "@wix/notifications": "latest",
        "@wix/pricing-plans": "latest",
        "@wix/redirects": "latest",
        "@wix/secrets": "latest",
        "@wix/stores": "latest",
        "@wix/table-reservations": "latest",
        "@wix/workflows": "latest"
    },
    preloadPackages: true,
    // Log progress updates to a div console
    onUpdate: (u, t) => {
        const mountPoint = document.getElementById('logs-mountpoint')!;
        const log = document.createElement('div');
        log.innerHTML = t;
        mountPoint.appendChild(log);
        mountPoint.scrollTop = mountPoint.scrollHeight;
    },

    // Log errors to a div console
    onError: e => {
        const mountPoint = document.getElementById('logs-mountpoint')!;
        const log = document.createElement('div');
        log.classList.add('err');
        log.innerHTML = e;
        mountPoint.appendChild(log);
        mountPoint.scrollTop = mountPoint.scrollHeight;
    },

    // Print loaded versions to DOM
    onUpdateVersions: versions => {
        document.getElementById('versions-mountpoint')!.innerHTML = Object.entries(versions)
            .map(v => `<div>${v[0]}: ${v[1]}</div>`)
            .join('');
    },
});

document.getElementById('reset-cache')!.onclick = () => cache.clear();
