// Wire types come from contract.gen.ts — generated from the backend's
// Pydantic schemas (`serve/schemas.py`). Do not hand-edit shapes here;
// see docs/serve_v2_contract.md §8 for the sync flow.
//
// This file is the project's import surface: components import from
// '@/types/contract'. Pure-mobile types (route params, hook shapes —
// nothing on the wire) can live here. Currently none.
export * from './contract.gen';
