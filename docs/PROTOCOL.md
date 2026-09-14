# Protocol notes

Design decisions that are easy to get wrong, written down so they are arguable.

## The clock is a tick counter, not a wall clock

The message timestamp is not populated in every runtime this contract has to work
in, and a deadline that silently reads zero is worse than one that is openly
abstract. Deadlines are absolute tick values, the contract decides whether one has
passed, and the interface shows the tick rather than dressing it up as elapsed
time. Any account can advance the clock.

## Evidence has exactly one home in storage

One array per mandate, with two index maps pointing into it. A record stored twice
is a record that drifts: a seal written to one copy would be invisible through the
other.

## Terms and custody are separate fields

`payment_wei` is what was agreed. `payment_deposited` is what the chain moved.
Settlement reads the second. A mandate that agreed a price and received a smaller
deposit settles over the smaller number, and the difference is visible rather than
silently reconciled.

## Lists live as canonical JSON

The virtual machine refuses to let contract code instantiate nested collections
inside a storage record, so every list is stored as canonical JSON in a string
field and parsed at the view boundary. Canonical means sorted keys and no
incidental whitespace, which is what makes the checklist hash reproducible across
machines.

## The retrieval loop is duplicated on purpose

The linter requires every nondeterministic call to sit directly inside the
closures passed to the equivalence block; behind one more call frame it reports
the call as unreachable. The leader copy and the validator copy must therefore stay
byte-identical. If the leader framed evidence even slightly differently from the
validators, every round would fail for a reason that has nothing to do with the
work being judged.

## Rulings are appended, never overwritten

Each round writes a new ruling. The history of a contested mandate stays readable,
and `final_ruling_id` pins which one a settlement pays on so a later round cannot
redirect an earlier payment.

## A failed round consumes nothing

If consensus is not reached, the mandate returns to the stage it was in, no ruling
is stored and no custody moves. Retrying is therefore always safe, which is what
makes a slow adjudication tolerable in practice.

## The passport is counts, not a score

An operator's history records confirmed, partial, rejected and inconclusive
outcomes, contests faced, appeals won, critical failures and value verified. The
average is derived at read time from the parts, so it can never drift from them. A
reader who disagrees with how these should be weighed can weigh them differently.
