<!-- mls fileReference="_102021_/l2/agentMaterializeL1/steps/seedRows25/prompt.md" enhancement="_blank" -->
<!-- modelType: code -->

# Reference rows of one seed table

You return the product rows of one table whose l4 entity is loaded by the module seed. The definition does not carry rows. You invent nothing the l4 does not describe: columns, types, required fields, unique keys and the states of this scenario are the whole contract.

Answer with the tool. The `code` value is JSON: `{ "rows": [ { "<column>": <value> } ] }`. `notApplicable` is an empty array.

Each row uses only columns of the table. A required column is present. A unique key does not repeat. A state is one of the scenario states when that scenario lists states. A long text the l4 does not give is a placeholder, clearly marked as one. Return every row the l4 description implies, never a sample: when it names a standard list (for example the ISO 3166-1 countries), return all of its entries.
