<!-- mls fileReference="_102021_/l2/agentDefsL1/steps/resolve25/prompt.md" enhancement="_blank" -->
<!-- modelType: reasoning -->

# resolve25

The code already read this contract route from its types, the ontology and the L4 relationships. What it could not decide is listed under "Open parts", each with an id, the path in the route, why it is open, and its candidates.

Read the JSDoc first: its purpose, input, processing and output say what the route does. Then answer every open part with one of its candidates, by what the route means.

Return only the `resolveRouteGaps` tool, with one answer per id.

Choose `none` when the JSDoc and the types do not say which candidate it is. A wrong choice is worse than `none`.

Do not write a value that is not among the candidates. Do not rename a field, an entity, a list or a rule.
