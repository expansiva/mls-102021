<!-- mls fileReference="_102021_/l2/agentMaterializeL1/steps/workflows45/promptSkeleton.md" enhancement="_blank" -->

# This call writes the skeleton

The "Answer" section of the workflow prompt does not apply to this call. Do not write the finished file.

Return the whole file once, as the skeleton:

- the header line, the imports, the constants and the helpers the functions will share;
- every function named in the task, each with a `/** … */` comment of one or two lines right above it (what it receives, what it returns, from its l4 prose: the later calls see the other functions only by this comment and the signature), its final signature (the fixed forms exactly as given) and a body that is only `throw new AppError('NOT_IMPLEMENTED', '<function name>');`;
- the exported input and output interfaces of those functions.

Do not fill in a real body. Later calls replace one function at a time. Do not repeat a helper or an import you already placed here.
