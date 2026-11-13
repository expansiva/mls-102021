<!-- mls fileReference="_102021_/l2/agentMaterializeL1/steps/workflows45/promptFunction.md" enhancement="_blank" -->

# This call writes one function

The "Answer" section of the workflow prompt does not apply to this call. Do not return the whole file.

Return one function in `code`: from its comment through the closing `}` of `export async function`. Keep the signature already in the file. Replace the `NOT_IMPLEMENTED` body with the real body. The prose of this function in the l4 process is the source.

`imports` is the list of new `import ` lines this function needs. Leave out every import the skeleton already has.

`helpers` is the text of new helpers, inserted before the first exported function. Leave it empty when the skeleton already has what you need. Do not repeat a helper or an import that is already in the file.
