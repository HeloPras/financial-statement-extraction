export function cleanLLMJson(raw: string): string {
  if (!raw) return "{}"

  if(raw.includes("`")){

  return raw
    .replace(/^\s*```json\s*/i, "")
    .replace(/^\s*```\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim()

}

return raw
}
