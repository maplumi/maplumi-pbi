declare module 'chroma-js' {
    interface ChromaScale {
        mode(mode: string): ChromaScale;
        domain(domain: number[]): ChromaScale;
        colors(count: number): string[];
    }

    interface ChromaStatic {
        scale(colors: string[]): ChromaScale;
        limits(values: number[], mode: 'q' | 'e' | 'l', count: number): number[];
    }

    const chroma: ChromaStatic;
    export = chroma;
} 