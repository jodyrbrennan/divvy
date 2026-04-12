export const RECIPROCAL = { spouse: "spouse", partner: "partner", parent: "child", child: "parent", sibling: "sibling", roommate: "roommate", grandparent: "grandchild", grandchild: "grandparent", other: "other" };

/**
 * Shared relationship options used by Dashboard.jsx and AddMemberScreen.jsx.
 * The `d` field provides a description for the AddMemberScreen hold-to-select UI.
 * The `altLabel` field provides an alternative label phrased as "I'm their X" for AddMemberScreen.
 */
export const RELATIONSHIP_OPTIONS = [
  { v: "spouse", l: "Spouse", d: "Married partner", altLabel: "Spouse" },
  { v: "partner", l: "Partner", d: "Unmarried partner", altLabel: "Partner" },
  { v: "parent", l: "Parent", d: "They are my child", altLabel: "I'm their parent" },
  { v: "child", l: "Child", d: "They are my parent", altLabel: "I'm their child" },
  { v: "sibling", l: "Sibling", d: "Brother or sister", altLabel: "Sibling" },
  { v: "roommate", l: "Roommate", d: "We share a living space", altLabel: "Roommate" },
  { v: "grandparent", l: "Grandparent", d: "They are my grandchild", altLabel: "I'm their grandparent" },
  { v: "grandchild", l: "Grandchild", d: "They are my grandparent", altLabel: "I'm their grandchild" },
  { v: "other", l: "Other", d: "Another type of relationship", altLabel: "Other" },
];

export function propagateRelationships(users) {
  let changed = true;
  let iterations = 0;
  while (changed && iterations < 10) {
    changed = false;
    iterations++;
    for (const a of users) {
      for (const b of users) {
        if (b.id === a.id) continue;
        const aToB = (a.relationships || {})[b.id];
        if (!aToB) continue;

        // Rule 1: Set reciprocal on B if missing
        const expected = RECIPROCAL[aToB];
        if (expected && !(b.relationships || {})[a.id]) {
          b.relationships = { ...(b.relationships || {}), [a.id]: expected };
          changed = true;
        }

        // Rules that involve a third user C
        for (const c of users) {
          if (c.id === a.id || c.id === b.id) continue;
          const aToC = (a.relationships || {})[c.id];

          // Rule 2: Both children of same parent → siblings
          if (aToB === "parent" && aToC === "parent" && !(b.relationships || {})[c.id]) {
            b.relationships = { ...(b.relationships || {}), [c.id]: "sibling" };
            changed = true;
          }

          // Rule 3: A is B's spouse/partner and A is C's parent → B is also C's parent
          if ((aToB === "spouse" || aToB === "partner") && aToC === "parent" && !(b.relationships || {})[c.id]) {
            b.relationships = { ...(b.relationships || {}), [c.id]: "parent" };
            changed = true;
          }
          // A is B's spouse/partner and A is C's child → B is also C's child
          if ((aToB === "spouse" || aToB === "partner") && aToC === "child" && !(b.relationships || {})[c.id]) {
            b.relationships = { ...(b.relationships || {}), [c.id]: "child" };
            changed = true;
          }

          // Rule 4: A is B's parent and B is C's parent → A is C's grandparent
          const bToC = (b.relationships || {})[c.id];
          if (aToB === "child" && bToC === "parent" && !(a.relationships || {})[c.id]) {
            a.relationships = { ...(a.relationships || {}), [c.id]: "grandparent" };
            changed = true;
          }
          if (aToB === "parent" && bToC === "child" && !(a.relationships || {})[c.id]) {
            a.relationships = { ...(a.relationships || {}), [c.id]: "grandchild" };
            changed = true;
          }
        }
      }
    }
  }
  return users;
}
