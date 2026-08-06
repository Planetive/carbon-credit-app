# Backend — two mismatch fixes

> **Status:** Verified clean (backend commit `6c19f90` local). No further formula edits.

| Case | Expected | Backend | Match |
|------|---------:|--------:|:-----:|
| `mobile_liter_to_gallon` (qty=10, factor=8.78, `input_unit=liter`) | 23.194317 | 23.194317 | yes |
| `heat_mmscf_to_mmbtu` (qty=1, `quantity_unit=mmscf`, co2=53.06) | 55023.22 | 55023.22 | yes |

Code paths already match SPA: liter/litre always ÷3.78541; mmscf always ×1037 on the wire.
