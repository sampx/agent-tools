/**
 * Parses a model string into providerID and modelID.
 * Formats supported: "provider/model" or "model"
 *
 * @param modelStr - The raw model string
 * @returns Object containing providerID and modelID
 *
 * @example
 * parseModel("openai/gpt-4")
 * // => { providerID: "openai", modelID: "gpt-4" }
 *
 * @example
 * parseModel("gpt-4")
 * // => { providerID: "", modelID: "gpt-4" }
 */
export function parseModel(
  modelStr?: string
): { providerID: string; modelID: string } {
  if (!modelStr || modelStr.trim() === '') {
    return { providerID: '', modelID: '' };
  }

  const cleanStr = modelStr.trim();
  const parts = cleanStr.split('/');

  if (parts.length >= 2) {
    // If there are multiple slashes, like a/b/c, provider is 'a', model is 'b/c'
    const providerID = parts[0];
    const modelID = parts.slice(1).join('/');
    return { providerID, modelID };
  }

  return { providerID: '', modelID: cleanStr };
}
