import { MapConfig } from "../config/VisualConfig";
import { CacheEntry } from "../types/index";

export class CacheService {
    private cache: Map<string, CacheEntry<any>>;
    private maxEntries: number;
    private expiryMs: number;

    constructor() {
        this.cache = new Map();
        this.maxEntries = MapConfig.CACHE.MAX_ENTRIES;
        this.expiryMs = MapConfig.CACHE.EXPIRY_MS;
    }

    public async getOrFetch<T>(
        key: string,
        fetchFn: () => Promise<T>
    ): Promise<T> {
        const cached = this.cache.get(key);

        if (cached && this.isValid(cached.timestamp)) {
            return cached.data;
        }

        const data = await fetchFn();
        this.set(key, data);
        return data;
    }

    public set<T>(key: string, data: T): void {
        if (this.cache.size >= this.maxEntries) {
            this.evictOldest();
        }

        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    public get<T>(key: string): T | undefined {
        const entry = this.cache.get(key);
        if (!entry || !this.isValid(entry.timestamp)) {
            return undefined;
        }
        return entry.data;
    }

    public clear(): void {
        this.cache.clear();
    }

    private isValid(timestamp: number): boolean {
        return Date.now() - timestamp < this.expiryMs;
    }

    private evictOldest(): void {
        let oldestKey: string | null = null;
        let oldestTimestamp = Infinity;

        for (const [key, entry] of this.cache.entries()) {
            if (entry.timestamp < oldestTimestamp) {
                oldestTimestamp = entry.timestamp;
                oldestKey = key;
            }
        }

        if (oldestKey) {
            this.cache.delete(oldestKey);
        }
    }
} 