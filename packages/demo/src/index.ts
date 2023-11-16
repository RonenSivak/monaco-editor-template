import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import {AutoTypings} from 'monaco-editor-auto-typings';
import {editorContents} from './editorContents';

import './style.css';
import {ServerStorageCache} from "./ServerStorageCache";

const model = monaco.editor.createModel(editorContents, 'typescript' /*Uri.parse('file://root/index.ts')*/);

const editor = monaco.editor.create(document.getElementById('editor-mountpoint')!, {
    model: model,
    language: 'javascript',
    automaticLayout: true,
    suggest: {
        // Autocompletion insert mode
        insertMode: 'insert', // or 'replace'

        // Enable graceful matching
        filterGraceful: true,

        // Prevent quick suggestions when a snippet is active
        snippetsPreventQuickSuggestions: true,

        // Favors words that appear close to the cursor
        localityBonus: true,

        // Enable using global storage for remembering suggestions
        shareSuggestSelections: true,

        // Enable or disable icons in suggestions
        showIcons: true,

        // Enable or disable the suggest status bar
        showStatusBar: true,

        // Enable or disable the rendering of the suggestion preview
        preview: true,

        // Configure the mode of the preview
        previewMode: 'subwordSmart',

        // Show details inline with the label
        showInlineDetails: true,
    },
});
editor.setModel(model);

const cache = new ServerStorageCache();


AutoTypings.create(editor, {
    // Cache declaration files to local storage
    sourceCache: cache,
    // Log progress updates to a div console
    onUpdate: (u, t) => {
        const mountPoint = document.getElementById('logs-mountpoint')!;
        const log = document.createElement('div');
        log.innerHTML = t;
        mountPoint.appendChild(log);
        mountPoint.scrollTop = mountPoint.scrollHeight;
    },
    debounceDuration: 400,
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

    versions: {
        "@wix/sdk": "latest",
        "@wix/sdk-react": "latest",
        "@wix/dashboard": "latest",
    },
    preloadPackages: true,
    shareCache: true,
    dontRefreshModelValueAfterResolvement: true,
    packageRecursionDepth: 0,
    fileRecursionDepth: 5,
});

document.getElementById('reset-cache')!.onclick = () => cache.clear();
