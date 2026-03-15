# On-Chain Blog on Sepolia — Roadmap

## Why On-Chain?

- Censorship-resistant: no one can take down your posts
- Verifiable authorship: every post is signed by your wallet
- Permanent: lives on the blockchain forever
- Transparent: anyone can verify the data

## Architecture

### Smart Contract (Solidity)

```
BlogRegistry.sol
├── struct Post { string title, string contentHash, bool isPrivate, uint256 timestamp }
├── mapping(uint256 => Post) public posts
├── mapping(address => bool) public authorizedWriters
├── function createPost(title, contentHash, isPrivate) onlyWriter
├── function deletePost(postId) onlyWriter
├── function getPost(postId) view returns (Post)
├── function getPostCount() view returns (uint256)
└── Events: PostCreated, PostDeleted
```

### What Goes On-Chain vs Off-Chain

| Data | Storage | Why |
|------|---------|-----|
| Title | On-chain | Small, indexable |
| Content hash (IPFS CID) | On-chain | Pointer to full content |
| Full description + markdown | IPFS (Pinata/web3.storage) | Too large for calldata |
| Photos | IPFS | Way too expensive on-chain |
| Private encrypted blob | IPFS (encrypted) | Same AES-256-GCM encryption |
| is_private flag | On-chain | Needed for filtering |
| timestamp | On-chain (block.timestamp) | Free |

### Cost Estimates (Sepolia = free testnet gas)

- createPost: ~100k-200k gas (just storing title + IPFS hash)
- deletePost: ~30k gas
- On mainnet this would cost $5-20 per post depending on gas prices
- On Sepolia: free (get test ETH from faucets)

## Migration Plan

### Phase 1: Smart Contract
1. Write `BlogRegistry.sol` with Foundry/Hardhat
2. Add `authorizedWriters` mapping (your wallet + future wallets)
3. Deploy to Sepolia
4. Verify on Etherscan

### Phase 2: IPFS Integration
1. Set up Pinata or web3.storage account
2. On post creation:
   - Upload content + photos to IPFS → get CID
   - For private posts: encrypt first, then upload
   - Call `createPost(title, cid, isPrivate)` on contract
3. On post read:
   - Read title + CID from contract
   - Fetch full content from IPFS gateway
   - For private: fetch → decrypt with ENCRYPTION_KEY

### Phase 3: Hybrid Mode
Keep Supabase as a cache/index layer for fast reads:
- Write: IPFS + contract + mirror to Supabase
- Read: Supabase first (fast), fallback to IPFS + contract
- Supabase becomes optional — blog works even if Supabase is down

### Phase 4: Full Decentralization (Optional)
- Replace Supabase entirely
- Use The Graph for indexing contract events
- Use ENS for the blog domain (0xshubh.eth)
- Host frontend on IPFS/Fleek

## Tech Stack Addition

```
Current:  Next.js + Supabase + WalletConnect
On-chain: + Foundry/Hardhat + ethers.js + IPFS (Pinata) + Sepolia
Future:   + The Graph + ENS + Fleek/IPFS hosting
```

## Contract Interface (Draft)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract BlogRegistry {
    struct Post {
        string title;
        string contentCID;  // IPFS hash
        bool isPrivate;
        uint256 createdAt;
        bool deleted;
    }

    address public owner;
    mapping(address => bool) public writers;
    Post[] public posts;

    event PostCreated(uint256 indexed id, string title, string contentCID, bool isPrivate);
    event PostDeleted(uint256 indexed id);

    modifier onlyWriter() {
        require(writers[msg.sender] || msg.sender == owner, "Not authorized");
        _;
    }

    constructor() {
        owner = msg.sender;
        writers[msg.sender] = true;
    }

    function createPost(
        string calldata title,
        string calldata contentCID,
        bool isPrivate
    ) external onlyWriter returns (uint256) {
        uint256 id = posts.length;
        posts.push(Post(title, contentCID, isPrivate, block.timestamp, false));
        emit PostCreated(id, title, contentCID, isPrivate);
        return id;
    }

    function deletePost(uint256 id) external onlyWriter {
        require(id < posts.length, "Post not found");
        posts[id].deleted = true;
        emit PostDeleted(id);
    }

    function addWriter(address writer) external {
        require(msg.sender == owner, "Only owner");
        writers[writer] = true;
    }

    function getPostCount() external view returns (uint256) {
        return posts.length;
    }
}
```

## Next Steps

1. [ ] Set up Foundry project in `/contracts` directory
2. [ ] Write and test BlogRegistry.sol
3. [ ] Deploy to Sepolia
4. [ ] Add IPFS upload to the write API route
5. [ ] Update frontend to read from contract + IPFS
6. [ ] Keep Supabase as fast cache layer
