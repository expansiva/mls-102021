<!-- mls fileReference="_102021_/l2/agentDefsL1/skills/accessScope.md" enhancement="_blank" -->

# accessScope

Each grant keeps the declared `scopeMode`, `session: verified`, the relationship
`path`, and `pending`. `own` and `organization` stay different when the entity
and the disclosure are the same. The session is not a form field. A path step
names `relationshipId`, `from`, `to` and `field`. An empty path means the anchor
is already one of `entityRefs`, or no field-bearing relationship reaches it.
`pending: ACCESS_ANCHOR` stays. The anchor is not rewritten to `public`,
`organization` or another target.

A controller depends on this file. Its handlers keep `grantIds`. The policy is
read from this def through that dependency, including a scope reached through
another declared dependency. Do not copy the access source into the grant, and
do not add a second policy on the usecase. This type is not dispatched by
agentChangeBackend.
