export const MAX_BATCH_SIZE = 50;
export const MAX_ITEM_CHARS = 10_000;
export const MAX_FILE_BYTES = 1_048_576;

const CSV_HEADER_VALUES = new Set(["text", "message"]);

export class BatchParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BatchParseError";
  }
}

function cleanItems(rawItems: string[]): string[] {
  const items = rawItems
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  if (items.length === 0) {
    throw new BatchParseError("Add at least one non-empty message.");
  }

  if (items.length > MAX_BATCH_SIZE) {
    throw new BatchParseError(`A batch cannot contain more than ${MAX_BATCH_SIZE} items.`);
  }

  for (const item of items) {
    if (item.length > MAX_ITEM_CHARS) {
      throw new BatchParseError(
        `Each item must be at most ${MAX_ITEM_CHARS.toLocaleString()} characters.`,
      );
    }
  }

  return items;
}

export function parseTextareaInput(value: string): string[] {
  return cleanItems(value.split(/\r?\n/));
}

export function parseTxtContent(content: string): string[] {
  return cleanItems(content.split(/\r?\n/));
}

export function parseCsvContent(content: string): string[] {
  const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const items: string[] = [];

  for (const line of lines) {
    const firstColumn = line.split(",")[0]?.trim() ?? "";
    if (!firstColumn) {
      continue;
    }

    if (items.length === 0 && CSV_HEADER_VALUES.has(firstColumn.toLowerCase())) {
      continue;
    }

    items.push(firstColumn);
  }

  return cleanItems(items);
}

export function parseUploadedFile(file: File, content: string): string[] {
  const extension = file.name.split(".").pop()?.toLowerCase();

  if (extension === "txt") {
    return parseTxtContent(content);
  }

  if (extension === "csv") {
    return parseCsvContent(content);
  }

  throw new BatchParseError("Only .txt and .csv files are supported.");
}

export async function readUploadedFile(file: File): Promise<string[]> {
  if (file.size > MAX_FILE_BYTES) {
    throw new BatchParseError("Files must be 1 MB or smaller.");
  }

  const content = await file.text();
  return parseUploadedFile(file, content);
}
