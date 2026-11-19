# 03: Prove the partial-transfer split on Fuji

**What to build:** A scripted transfer of part of a batch against the deployed contract, proving the source keeps its remainder and the destination receives a derived batch. This is the behaviour every judge-facing custody claim rests on.

**Blocked by:** 01.

**Status:** ready-for-agent

- [ ] Deploy `DrugBatchRegistry` (compiled with via-IR) to Fuji
- [ ] Register `BATCH-TEST-1` with 100 units at clinic A
- [ ] Transfer 40 units to clinic B, passing `BATCH-TEST-1-T1` as the derived id
- [ ] `getBatch(BATCH-TEST-1)` returns 60 units at clinic A
- [ ] `getBatch(BATCH-TEST-1-T1)` returns 40 units at clinic B, `derivedFrom = BATCH-TEST-1`
- [ ] A second partial transfer from `BATCH-TEST-1` creates `-T2`
- [ ] Both transaction hashes recorded in the PR description
