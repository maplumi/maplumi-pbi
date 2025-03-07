declare module 'simple-statistics' {
    /**
     * Jenks natural breaks classification
     * @param data Array of numbers to classify
     * @param nClasses Number of classes to create
     * @returns Array of break points
     */
    export function jenks(data: number[], nClasses: number): number[];

    /**
     * C-means clustering
     * @param data Array of numbers to cluster
     * @param nClusters Number of clusters to create
     * @returns Array of clusters, where each cluster is an array of numbers
     */
    export function ckmeans(data: number[], nClusters: number): number[][];
} 