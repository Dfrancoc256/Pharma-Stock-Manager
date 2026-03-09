## Packages
date-fns | Formatting dates for receipts, sales, and registers
lucide-react | Already installed but confirming required for stunning iconography

## Notes
- App uses `@media print` CSS classes for the receipt printing feature without needing external libraries.
- The POS cart computes values based on string numerics parsed as floats.
- Dummy `saleId: 0` is sent from the frontend for `saleItems` since the backend should handle assigning the actual ID upon insertion.
- Using space-separated HSL values in index.css to create a premium, clean "Pharmacy Teal" aesthetic.
