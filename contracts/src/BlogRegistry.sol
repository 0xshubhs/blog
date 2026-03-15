// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title BlogRegistry — On-chain blog post registry
/// @notice Stores blog post metadata on-chain, full content on IPFS
/// @dev Mirrors the Supabase blog: create, edit, delete, pin, tags, private posts
contract BlogRegistry {
    // ─── Types ───────────────────────────────────────────────────────────

    struct Post {
        string title;
        string contentCID; // IPFS CID pointing to full content (description + photos)
        bool isPrivate; // if true, contentCID points to encrypted blob
        bool pinned;
        bool deleted;
        uint256 createdAt;
        uint256 updatedAt;
        string[] tags;
    }

    // ─── State ───────────────────────────────────────────────────────────

    address public owner;
    mapping(address => bool) public writers;
    Post[] public posts;

    // ─── Events ──────────────────────────────────────────────────────────

    event PostCreated(uint256 indexed id, address indexed author, string title, string contentCID, bool isPrivate);
    event PostUpdated(uint256 indexed id, string title, string contentCID, bool isPrivate);
    event PostDeleted(uint256 indexed id);
    event PostPinned(uint256 indexed id, bool pinned);
    event WriterAdded(address indexed writer);
    event WriterRemoved(address indexed writer);
    event OwnerTransferred(address indexed previousOwner, address indexed newOwner);

    // ─── Errors ──────────────────────────────────────────────────────────

    error NotAuthorized();
    error NotOwner();
    error PostNotFound();
    error PostAlreadyDeleted();
    error EmptyTitle();
    error EmptyCID();
    error TooManyTags();
    error ZeroAddress();

    // ─── Modifiers ───────────────────────────────────────────────────────

    modifier onlyWriter() {
        if (!writers[msg.sender] && msg.sender != owner) revert NotAuthorized();
        _;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier validPost(uint256 id) {
        if (id >= posts.length) revert PostNotFound();
        if (posts[id].deleted) revert PostAlreadyDeleted();
        _;
    }

    // ─── Constructor ─────────────────────────────────────────────────────

    constructor() {
        owner = msg.sender;
        writers[msg.sender] = true;
        emit WriterAdded(msg.sender);
    }

    // ─── Write Functions ─────────────────────────────────────────────────

    /// @notice Create a new blog post
    /// @param title Post title (stored on-chain for indexing)
    /// @param contentCID IPFS CID of the full content JSON
    /// @param isPrivate Whether the content is encrypted
    /// @param tags Array of tag strings (max 10)
    /// @return id The ID of the created post
    function createPost(
        string calldata title,
        string calldata contentCID,
        bool isPrivate,
        string[] calldata tags
    ) external onlyWriter returns (uint256) {
        if (bytes(title).length == 0) revert EmptyTitle();
        if (bytes(contentCID).length == 0) revert EmptyCID();
        if (tags.length > 10) revert TooManyTags();

        uint256 id = posts.length;
        posts.push();
        Post storage p = posts[id];
        p.title = title;
        p.contentCID = contentCID;
        p.isPrivate = isPrivate;
        p.pinned = false;
        p.deleted = false;
        p.createdAt = block.timestamp;
        p.updatedAt = block.timestamp;

        for (uint256 i = 0; i < tags.length; i++) {
            p.tags.push(tags[i]);
        }

        emit PostCreated(id, msg.sender, title, contentCID, isPrivate);
        return id;
    }

    /// @notice Edit an existing post
    /// @param id Post ID to edit
    /// @param title New title
    /// @param contentCID New IPFS CID
    /// @param isPrivate New privacy flag
    /// @param tags New tags array (max 10)
    function editPost(
        uint256 id,
        string calldata title,
        string calldata contentCID,
        bool isPrivate,
        string[] calldata tags
    ) external onlyWriter validPost(id) {
        if (bytes(title).length == 0) revert EmptyTitle();
        if (bytes(contentCID).length == 0) revert EmptyCID();
        if (tags.length > 10) revert TooManyTags();

        Post storage p = posts[id];
        p.title = title;
        p.contentCID = contentCID;
        p.isPrivate = isPrivate;
        p.updatedAt = block.timestamp;

        // Replace tags
        delete p.tags;
        for (uint256 i = 0; i < tags.length; i++) {
            p.tags.push(tags[i]);
        }

        emit PostUpdated(id, title, contentCID, isPrivate);
    }

    /// @notice Soft-delete a post
    /// @param id Post ID to delete
    function deletePost(uint256 id) external onlyWriter validPost(id) {
        posts[id].deleted = true;
        emit PostDeleted(id);
    }

    /// @notice Toggle pin status of a post
    /// @param id Post ID to pin/unpin
    function togglePin(uint256 id) external onlyWriter validPost(id) {
        posts[id].pinned = !posts[id].pinned;
        emit PostPinned(id, posts[id].pinned);
    }

    // ─── Writer Management ───────────────────────────────────────────────

    /// @notice Add an authorized writer
    /// @param writer Address to authorize
    function addWriter(address writer) external onlyOwner {
        if (writer == address(0)) revert ZeroAddress();
        writers[writer] = true;
        emit WriterAdded(writer);
    }

    /// @notice Remove an authorized writer
    /// @param writer Address to deauthorize
    function removeWriter(address writer) external onlyOwner {
        if (writer == address(0)) revert ZeroAddress();
        writers[writer] = false;
        emit WriterRemoved(writer);
    }

    /// @notice Transfer ownership to a new address
    /// @param newOwner New owner address
    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        address prev = owner;
        owner = newOwner;
        writers[newOwner] = true;
        emit OwnerTransferred(prev, newOwner);
    }

    // ─── View Functions ──────────────────────────────────────────────────

    /// @notice Get total number of posts (including deleted)
    function getPostCount() external view returns (uint256) {
        return posts.length;
    }

    /// @notice Get a single post by ID
    /// @param id Post ID
    function getPost(uint256 id)
        external
        view
        returns (
            string memory title,
            string memory contentCID,
            bool isPrivate,
            bool pinned,
            bool deleted,
            uint256 createdAt,
            uint256 updatedAt,
            string[] memory tags
        )
    {
        if (id >= posts.length) revert PostNotFound();
        Post storage p = posts[id];
        return (p.title, p.contentCID, p.isPrivate, p.pinned, p.deleted, p.createdAt, p.updatedAt, p.tags);
    }

    /// @notice Get tags for a post
    /// @param id Post ID
    function getPostTags(uint256 id) external view returns (string[] memory) {
        if (id >= posts.length) revert PostNotFound();
        return posts[id].tags;
    }

    /// @notice Batch fetch post summaries (for listing pages)
    /// @param offset Start index
    /// @param limit Max number of posts to return
    function getPosts(uint256 offset, uint256 limit)
        external
        view
        returns (
            uint256[] memory ids,
            string[] memory titles,
            bool[] memory isPrivateFlags,
            bool[] memory pinnedFlags,
            bool[] memory deletedFlags,
            uint256[] memory createdAts
        )
    {
        uint256 total = posts.length;
        if (offset >= total) {
            return (new uint256[](0), new string[](0), new bool[](0), new bool[](0), new bool[](0), new uint256[](0));
        }

        uint256 end = offset + limit;
        if (end > total) end = total;
        uint256 count = end - offset;

        ids = new uint256[](count);
        titles = new string[](count);
        isPrivateFlags = new bool[](count);
        pinnedFlags = new bool[](count);
        deletedFlags = new bool[](count);
        createdAts = new uint256[](count);

        for (uint256 i = 0; i < count; i++) {
            uint256 idx = offset + i;
            Post storage p = posts[idx];
            ids[i] = idx;
            titles[i] = p.title;
            isPrivateFlags[i] = p.isPrivate;
            pinnedFlags[i] = p.pinned;
            deletedFlags[i] = p.deleted;
            createdAts[i] = p.createdAt;
        }
    }
}
