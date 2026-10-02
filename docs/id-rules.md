# Driver's licenses and license plates

Two rules ship in the page, on by default: Driver's licenses (token `DLN`) and License plates (token `PLATE`). They cover all 50 US states, DC and the 10 Canadian provinces.

Each rule has two tiers. The strict tier is always on. It catches a value after a label that names the document, such as `driver's license`, `OLN` or `plate number`. After a short label such as `DL` or `tag:`, it takes only an ID-shaped value. It also catches printed license formats no other value shares, such as Florida `A123-456-78-901-0`.

The loose tier adds bare letter-and-digit license formats, such as California `A1234567` and `CA1111111`, and bare plate serials such as `8ABC123`. Aggressive mode runs every loose tier and also switches on the built-in rules' aggressive patterns.

On the two ID rows, the chip slot holds a Strict | Loose switch. It reads Strict or Loose, outlined when Strict and filled when Loose, and keeps one width in both states so the row never shifts. Each row's detail panel, which the info button opens, names its `DLN` or `PLATE` token. Driver's licenses starts on Loose and License plates starts on Strict. A reader's own choice is saved and kept, including in exports, imports and an edited copy of a seed. Loose turns on that rule's loose tier alone, without Aggressive mode and without the built-in rules' aggressive patterns. It folds the rule's loose patterns into its always-on patterns. The saved configuration, exports, the exported rules file and every generated recipe (CLI, Node, GitHub Actions, pre-commit) carry the same setting and give the same tokens. With Aggressive mode on, both switches read Loose and are held, and their hover text gives the reason. Built-in rules keep only the Aggressive switch.

The "Identity and vehicle records" sample shows both tiers on synthetic lines. It has labelled values for the strict tier, a printed Florida number, a plate in a JSON field and an AAMVA DAQ field, bare values that only Loose catches, and lookalikes that stay untouched: `OPS-1234`, `DL: 150.2 Mbps` and `VRM: OK`.

Some values match only after a label: all-digit licenses (Texas, Pennsylvania, New York and more than 20 others), all-digit plates (Delaware, New Hampshire, Rhode Island), vanity plates, and plates written with a space or hyphen, such as `ABC-1234`. Ticket keys, issue numbers and prose are written the same way. Vanity plate rules could not be verified for most jurisdictions and are not encoded.

Every format, its source URLs and a confidence grade are in `build/fixtures/id-formats.json`. The test values in `build/fixtures/id-vectors.json` are synthetic, built from repeated or sequential digits and placeholder letters, never a real license or plate number. `verify-id-rules.py` also runs both rules, with Loose on, over a 478 KB adversarial line and fails if the pass takes 1000 ms or more, which catches a pattern that backtracks badly.

Known limits:

- The loose tier cannot be free of false positives. `ABC1234` is both a New York plate and a build ID. Keep License plates on Strict and Aggressive off unless recall matters more than precision.
- The loose tier skips bare Missouri numbers that end in A to F, which read as hex. They still match after a label.
- Formats were read on 2026-09-27, mostly from secondary sources. License formats come largely from compiled format tables and screening and legal-reference sites, with a DMV or provincial page where one was found. Of the 61 license entries, 25 are HIGH confidence, 33 MEDIUM and 3 LOW (Rhode Island, South Dakota, Vermont). Plate formats rest on each jurisdiction's Wikipedia article, so none is above MEDIUM: 56 are MEDIUM and 5 LOW (Idaho, Pennsylvania, South Carolina, Washington, West Virginia). Unresolved source conflicts sit in `id-formats.json` with their confidence.
- Fields named `dl`, `tag` or `registration` are not keyed on. They usually hold download counts and version tags.
- No rule covers commercial driver's license labels (`CDL`), learner's permits, temporary, dealer or military plates, vehicle identification numbers (VINs), or IDs from Mexico or any other country outside the US and Canada.
