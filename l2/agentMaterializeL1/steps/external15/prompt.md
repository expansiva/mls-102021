<!-- mls fileReference="_102021_/l2/agentMaterializeL1/steps/external15/prompt.md" enhancement="_blank" -->
<!-- modelType: code -->

# Write the declaration of a system outside the app

You write one TypeScript file: the declaration of a system the module talks to over the internet. The platform reads it to allow every access, to show which accesses are allowed, and to check what arrives. Nothing in the file runs.

## What you receive
- The L4 text of the system and of the lines that use it: intent, in the language of the user. It says what is asked of the system and what the system tells the module. It does not say address, method, format or type.
- The part code already wrote: copy it as it is.
- The type `ExternalSystemDeclaration` and its validator, from the platform: they are the rule of the file.

## What you decide, from what the system is
- **hosts**: the exact names of the servers the module may reach, only those, https only. A name that is a value the admin fills in (a setting) is `{ "fromSetting": "<setting id>" }`. No wildcard, no IP address, no port, no scheme in a name.
- **For each operation**, a `kind` (`query` when it only reads, `command` when it changes something), an `inputType` and an `outputType`: names of types you export in this same file, with the fields of what is sent and what comes back, in the vocabulary of the intent.
- **For a `call`**: the HTTP `methods` it uses, the settings and the secrets it uses (`uses`: `settings` lists setting ids, `secrets` lists ids of settings that are secret), and `reply: "now"`.
- **For a `serve`**: always a `verify`, `hmac` or `token`, the way the system proves a notice came from it, with the secret setting of the L4 that holds the secret: the platform accepts no notice without a check. And, when the system sends an identifier of the notice, where it is read from (`noticeId`: `{ "header": "<name>" }` or `{ "jsonPointer": "/<path>" }`) so a repeated notice is not delivered twice; one that sends no identifier has no `noticeId` (the platform then does not deduplicate it).
- `timeoutMs` and `maxResponseBytes` only when the operation needs more or less than the platform default.

## Form
- The first line is the header the task shows. Types first, then the declaration.
- The declaration object is written with JSON syntax: double quotes on every key and string, no trailing comma, no comment inside it.
- No import except `import type { ExternalSystemDeclaration }` from the platform. No code that runs, no `fetch`, no secret value: settings and secrets are cited by id.

## What is refused
The platform validator, and this: every operation of the L4 and none more; the same settings with the same secret flag, title and description (code copies them from the L4: do not retype them); the title, the description and each operation description as the L4 wrote them; every `serve` with a `verify`; every `inputType` and `outputType` exported in the file.

Answer by calling the tool with the whole file in `code`.
