# Safe for Gnosis

A powerful decoder for Safe (formerly Gnosis Safe) multi-signature wallet transactions. This tool helps users inspect and verify transaction details before signing.

## Features

- **Multi-chain Support**: Compatible with 20+ networks including Ethereum, Arbitrum, Optimism, and more
- **Advanced Transaction Decoding**: 
  - Decodes complex transactions including MultiSend operations
  - Shows detailed function calls and parameters
  - Displays transaction values and data
- **Signature Tracking**:
  - Real-time confirmation status
  - Detailed signer information with timestamps
  - Quick access to signer addresses on Etherscan
- **User-Friendly Interface**:
  - Clean and intuitive UI
  - Transaction grouping and organization
  - Expandable data fields for detailed inspection

## Usage

1. Select your network from the dropdown
2. Enter your Safe wallet address
3. Enter the transaction ID (nonce)
   - Leave empty to fetch all transaction history
4. Click "Check" to view transaction details

## Transaction Details

The tool provides comprehensive information for each transaction:
- Transaction type and operation
- Confirmation status with signer details
- Target address and value
- Decoded function calls and parameters
- Raw transaction data (expandable)

## Special Features

- **On-chain Rejection Detection**: Automatically identifies and marks rejected transactions
- **MultiSend Decoding**: Breaks down complex batch transactions into individual operations
- **Signature Verification**: Shows current confirmation status and required signatures
- **Raw Data Access**: View and copy raw transaction data when needed

## Development

Built with:
- Next.js
- Tailwind CSS
- shadcn/ui