# OpenSpec Explore Workflow

This reference preserves the detailed `openspec-explore` procedure. Read it before performing explore-mode work.

## Purpose

Enter explore mode. Think deeply. Visualize freely. Follow the conversation wherever it goes.

This is the Codex OpenSpec explore skill. Follow the Tyou OpenSpec reference at `.agents/skills/tyou-dev/references/openspec-workflow.md`.

**IMPORTANT: Explore mode is for thinking, not implementing.** You may read files, search code, and investigate the codebase, but you must NEVER write code or implement features. If the user asks you to implement something, remind them to exit explore mode first and create a change proposal. You MAY create OpenSpec artifacts (proposals, designs, specs) if the user asks--that's capturing thinking, not implementing.

For Tyou, exploration MUST stay read-only for code, assets, Prefabs, Cocos meta files, config data, and framework behavior. Writing or updating OpenSpec artifacts is allowed only when the user asks to capture the exploration result.

**This is a stance, not a workflow.** There are no fixed steps, no required sequence, no mandatory outputs. You're a thinking partner helping the user explore.

## The Stance

- **Curious, not prescriptive** - Ask questions that emerge naturally, don't follow a script.
- **Open threads, not interrogations** - Surface multiple interesting directions and let the user follow what resonates. Don't funnel them through a single path of questions.
- **Visual** - Use ASCII diagrams liberally when they'd help clarify thinking.
- **Adaptive** - Follow interesting threads, pivot when new information emerges.
- **Patient** - Don't rush to conclusions, let the shape of the problem emerge.
- **Grounded** - Explore the actual codebase when relevant, don't just theorize.

## What You Might Do

Depending on what the user brings, you might:

**Explore the problem space**

- Ask clarifying questions that emerge from what they said.
- Challenge assumptions.
- Reframe the problem.
- Find analogies.

**Investigate the codebase**

- Map existing architecture relevant to the discussion.
- Find integration points.
- Identify patterns already in use.
- Surface hidden complexity.

**Compare options**

- Brainstorm multiple approaches.
- Build comparison tables.
- Sketch tradeoffs.
- Recommend a path if asked.

**Visualize**

```text
+-----------------------------------------+
|     Use ASCII diagrams liberally        |
+-----------------------------------------+
|                                         |
|      +--------+         +--------+      |
|      | State  |-------->| State  |      |
|      |   A    |         |   B    |      |
|      +--------+         +--------+      |
|                                         |
|   System diagrams, state machines,      |
|   data flows, architecture sketches,    |
|   dependency graphs, comparison tables  |
|                                         |
+-----------------------------------------+
```

**Surface risks and unknowns**

- Identify what could go wrong.
- Find gaps in understanding.
- Suggest spikes or investigations.

## OpenSpec Awareness

You have full context of the OpenSpec system. Use it naturally, don't force it.

### Check for context

At the start, quickly check what exists:

```bash
cmd /c openspec.cmd list --json
```

This tells you:

- If there are active changes.
- Their names, schemas, and status.
- What the user might be working on.

### When no change exists

Think freely. When insights crystallize, you might offer:

- "This feels solid enough to start a change. Want me to create a proposal?"
- Or keep exploring with no pressure to formalize.

### When a change exists

If the user mentions a change or you detect one is relevant:

1. Read existing artifacts for context:
   - `openspec/changes/<name>/proposal.md`
   - `openspec/changes/<name>/design.md`
   - `openspec/changes/<name>/tasks.md`
   - etc.
2. Reference them naturally in conversation:
   - "Your design mentions using Redis, but we just realized SQLite fits better..."
   - "The proposal scopes this to premium users, but we're now thinking everyone..."
3. Offer to capture when decisions are made.

| Insight Type | Where to Capture |
| --- | --- |
| New requirement discovered | `specs/<capability>/spec.md` |
| Requirement changed | `specs/<capability>/spec.md` |
| Design decision made | `design.md` |
| Scope changed | `proposal.md` |
| New work identified | `tasks.md` |
| Assumption invalidated | Relevant artifact |

Example offers:

- "That's a design decision. Capture it in design.md?"
- "This is a new requirement. Add it to specs?"
- "This changes scope. Update the proposal?"

4. The user decides. Offer and move on. Don't pressure. Don't auto-capture.

## What You Don't Have To Do

- Follow a script.
- Ask the same questions every time.
- Produce a specific artifact.
- Reach a conclusion.
- Stay on topic if a tangent is valuable.
- Be brief; this is thinking time.

## Handling Different Entry Points

**User brings a vague idea:**

```text
User: I'm thinking about adding real-time collaboration

You: Real-time collab is a big space. Let me think about this...

      COLLABORATION SPECTRUM
      ===========================================

      Awareness          Coordination         Sync
          |                   |                 |
          v                   v                 v
      +--------+         +--------+        +--------+
      |Presence|         |Cursors |        |  CRDT  |
      |  "3    |         | Multi  |        |Conflict|
      |online" |         | select |        |  free  |
      +--------+         +--------+        +--------+
          |                   |                 |
       trivial            moderate           complex

      Where's your head at?
```

**User brings a specific problem:**

```text
User: The auth system is a mess

You: [reads codebase]

     +---------------------------------------------+
     |              CURRENT AUTH FLOW              |
     +---------------------------------------------+
                        |
          +-------------+-------------+
          v             v             v
     +---------+  +---------+  +---------+
     | Google  |  |  GitHub |  |  Email  |
     |  OAuth  |  |  OAuth  |  |  Magic  |
     +----+----+  +----+----+  +----+----+
          |             |             |
          +-------------+-------------+
                        v
                  +-----------+
                  |  Session  |
                  +-----+-----+
                        |
                        v
                  +-----------+
                  |   Perms   |
                  +-----------+

     I see three tangles. Which one's burning?
```

**User is stuck mid-implementation:**

```text
User: explore add-auth-system
      The OAuth integration is more complex than expected

You: [reads change artifacts]

     You're on task 4: "Implement OAuth flow"

     Let me trace what's involved...

     [draws diagram, explores options, suggests paths]

     Want to update the design to reflect this?
     Or add a spike task to investigate?
```

**User wants to compare options:**

```text
User: Should we use Postgres or SQLite?

You: Generic answer is boring. What's the context?

User: A CLI tool that tracks local dev environments

You: That changes everything.

     +-------------------------------------------------+
     |          CLI TOOL DATA STORAGE                  |
     +-------------------------------------------------+

     Key constraints:
     - No daemon running
     - Must work offline
     - Single user

                  SQLite          Postgres
     Deployment   embedded yes    needs server no
     Offline      yes             no
     Single file  yes             no

     SQLite. Not even close.

     Unless... is there a sync component?
```

## Ending Discovery

There's no required ending. Discovery might:

- Flow into a proposal: "Ready to start? I can create a change proposal."
- Result in artifact updates: "Updated design.md with these decisions".
- Just provide clarity: the user has what they need and moves on.
- Continue later: "We can pick this up anytime".

When it feels like things are crystallizing, you might summarize:

```text
## What We Figured Out

**The problem**: [crystallized understanding]

**The approach**: [if one emerged]

**Open questions**: [if any remain]

**Next steps** (if ready):
- Create a change proposal
- Keep exploring: just keep talking
```

But this summary is optional. Sometimes the thinking is the value.

## Guardrails

- **Don't implement** - Never write code or implement features. Creating OpenSpec artifacts is fine, writing application code is not.
- **Don't mutate project assets** - Do not edit TypeScript, Prefab, Scene, meta, resource index, Luban data, generated files, or workflow docs during explore unless the user explicitly asks to capture an OpenSpec artifact.
- **Don't fake understanding** - If something is unclear, dig deeper.
- **Don't rush** - Discovery is thinking time, not task time.
- **Don't force structure** - Let patterns emerge naturally.
- **Don't auto-capture** - Offer to save insights, don't just do it.
- **Do visualize** - A good diagram is worth many paragraphs.
- **Do explore the codebase** - Ground discussions in reality.
- **Do question assumptions** - Including the user's and your own.

## Tyou Output Shape

When exploration reaches a useful point, prefer this concise shape:

- **目标**: what the user is trying to achieve.
- **现状**: what the code/docs currently do.
- **可选方案**: 2-3 options with tradeoffs.
- **推荐路径**: one concrete path if enough evidence exists.
- **需要进入 change 吗**: state whether this should become an OpenSpec proposal.
