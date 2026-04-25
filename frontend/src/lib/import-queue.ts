export const IMPORT_QUEUE_KEY = "designStudio_importQueue";

export interface ImportQueueItem {
    url: string;
    filename: string;
    sourceTool?: string;
}
