import React, {useEffect, useRef} from "react";
import {editorContents} from "../../editorContents";
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import {AutoTypings} from "monaco-editor-auto-typings";
import "../../style.css";
import {ServerStorageCache} from "../../ServerStorageCache";

const MonacoEditor = () => {
    const editorRef = useRef<HTMLDivElement | null>(null);
    const [editor, setEditor] = React.useState<monaco.editor.IStandaloneCodeEditor | null>(null);
    useEffect(() => {
        const uri = monaco.Uri.parse("inmemory://model/");
        const model = monaco.editor.createModel(
            editorContents,
            "typescript",
        );

        const editor = monaco.editor.create(editorRef.current!, {
            model: model,
            language: "javascript",
            automaticLayout: true,
            theme: 'vs',

            // General appearance
            fontFamily: 'Menlo, Monaco, "Courier New", monospace',
            fontSize: 14,
            fontWeight: 'normal',
            lineHeight: 20,
            letterSpacing: 0.5,

            // Cursor
            cursorBlinking: 'blink',
            cursorStyle: 'line',
            cursorWidth: 2,

            // Scrollbar
            scrollbar: {
                vertical: 'visible',
                horizontal: 'visible',
                useShadows: true,
                verticalHasArrows: false,
                horizontalHasArrows: false,
                alwaysConsumeMouseWheel: false,
            },

            // Line numbers
            lineNumbers: 'on',
            lineNumbersMinChars: 3,

            // Decorations
            glyphMargin: true,
            lineDecorationsWidth: 10,

            // Word wrap
            wordWrap: 'on',
            wordWrapColumn: 80,

            // Other settings
            readOnly: false,
            showFoldingControls: 'always',
            minimap: {
                enabled: true,
                renderCharacters: false,
                showSlider: 'mouseover',
                side: 'right',
            },
            quickSuggestions: true,
            suggestFontSize: 14,
            suggestLineHeight: 20,
            suggestOnTriggerCharacters: true,
            useTabStops: true,
            tabCompletion: 'on',
        });
        setEditor(editor);
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
