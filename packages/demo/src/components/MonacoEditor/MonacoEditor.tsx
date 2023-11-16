import React, {useEffect, useRef} from "react";
import {editorContents} from "../../editorContents";
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import {AutoTypings} from "monaco-editor-auto-typings";
import "../../style.css";
import {ServerStorageCache} from "../../ServerStorageCache";

const MonacoEditor = () => {
    const editorRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const model = monaco.editor.createModel(
            editorContents,
            "typescript" /*Uri.parse('file://root/index.ts')*/
        );

        const editor = monaco.editor.create(editorRef.current!, {
            model: model,
            language: "javascript",
            automaticLayout: true,
            suggest: {
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
            sourceCache: cache,
            debounceDuration: 400,
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

        // Clean up the editor when the component unmounts
        return () => {
            editor.dispose();
            model.dispose();
        };
    }, []);

    return <div ref={editorRef} style={{height: "100vh"}}/>;
};

export default MonacoEditor;
