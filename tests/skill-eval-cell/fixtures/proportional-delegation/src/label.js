export function label(value) {
  if (typeof value !== "string") throw new TypeError("Expected a string")
  const trimmed = value.trim()
  if (trimmed.length === 0) {
    return "Untitled"
  } else {
    return trimmed
  }
}
