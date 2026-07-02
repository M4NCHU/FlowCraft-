import type { HallEntityPlaceholder } from "./types";

export function mapHallEntity(
  input: Partial<HallEntityPlaceholder>,
): HallEntityPlaceholder {
  return {
    id: input.id ?? "",
    name: input.name ?? "",
  };
}
