export interface SourceCache {
    isFileAvailable?: (uri: string) => Promise<boolean>;
    storeFile: (uri: string, content: string) => Promise<void>;
    getFile: (uri: string) => Promise<string | undefined>;
    clear: () => Promise<void>;
}

// Simulated server-side storage
interface ServerStorage {
    [key: string]: string | undefined;
}

const serverStorage: ServerStorage = {};

export class ServerStorageCache implements SourceCache {
    private localCache: Record<string, string> = {};

    public async getFile(uri: string): Promise<string | undefined> {
        try {
            // Simulated server request to retrieve the file content
            const content = serverStorage[uri];
            return content !== undefined ? content : undefined;
        } catch (e) {
            return this.localCache[uri];
        }
    }

    public async storeFile(uri: string, content: string): Promise<void> {
        this.localCache[uri] = content;
        try {
            // Simulated server request to store the file content
            serverStorage[uri] = content;
        } catch (e) {
            // Handle the error, log, or perform any necessary action
        }
    }

    public async clear(): Promise<void> {
        this.localCache = {};
        // Simulated server-side clear operation
        for (const key in serverStorage) {
            if (serverStorage.hasOwnProperty(key)) {
                delete serverStorage[key];
            }
        }
    }
}
