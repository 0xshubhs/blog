// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {BlogRegistry} from "../src/BlogRegistry.sol";

contract BlogRegistryTest is Test {
    BlogRegistry public blog;
    address public owner = address(this);
    address public writer = address(0x1);
    address public random = address(0x2);

    function setUp() public {
        blog = new BlogRegistry();
    }

    // ─── Deployment ──────────────────────────────────────────────────────

    function test_DeploymentSetsOwner() public view {
        assertEq(blog.owner(), owner);
    }

    function test_OwnerIsWriter() public view {
        assertTrue(blog.writers(owner));
    }

    function test_InitialPostCountIsZero() public view {
        assertEq(blog.getPostCount(), 0);
    }

    // ─── Create Post ─────────────────────────────────────────────────────

    function test_CreatePost() public {
        string[] memory tags = new string[](2);
        tags[0] = "web3";
        tags[1] = "solidity";

        uint256 id = blog.createPost("Hello World", "QmTest123", false, tags);
        assertEq(id, 0);
        assertEq(blog.getPostCount(), 1);

        (
            string memory title,
            string memory cid,
            bool isPrivate,
            bool pinned,
            bool deleted,
            uint48 createdAt,
            ,
            string[] memory postTags
        ) = blog.getPost(0);

        assertEq(title, "Hello World");
        assertEq(cid, "QmTest123");
        assertFalse(isPrivate);
        assertFalse(pinned);
        assertFalse(deleted);
        assertGt(createdAt, 0);
        assertEq(postTags.length, 2);
        assertEq(postTags[0], "web3");
    }

    function test_CreatePrivatePost() public {
        string[] memory tags = new string[](0);
        blog.createPost("Secret", "QmEncrypted", true, tags);

        (, , bool isPrivate, , , , , ) = blog.getPost(0);
        assertTrue(isPrivate);
    }

    function test_CreatePostEmitsEvent() public {
        string[] memory tags = new string[](0);

        vm.expectEmit(true, true, false, true);
        emit BlogRegistry.PostCreated(0, owner, "Test", "QmCID", false);

        blog.createPost("Test", "QmCID", false, tags);
    }

    function test_RevertCreatePostEmptyTitle() public {
        string[] memory tags = new string[](0);
        vm.expectRevert(BlogRegistry.EmptyTitle.selector);
        blog.createPost("", "QmCID", false, tags);
    }

    function test_RevertCreatePostEmptyCID() public {
        string[] memory tags = new string[](0);
        vm.expectRevert(BlogRegistry.EmptyCID.selector);
        blog.createPost("Title", "", false, tags);
    }

    function test_RevertCreatePostTooManyTags() public {
        string[] memory tags = new string[](11);
        for (uint256 i = 0; i < 11; i++) {
            tags[i] = "tag";
        }
        vm.expectRevert(BlogRegistry.TooManyTags.selector);
        blog.createPost("Title", "QmCID", false, tags);
    }

    function test_RevertCreatePostUnauthorized() public {
        string[] memory tags = new string[](0);
        vm.prank(random);
        vm.expectRevert(BlogRegistry.NotAuthorized.selector);
        blog.createPost("Title", "QmCID", false, tags);
    }

    // ─── Edit Post ───────────────────────────────────────────────────────

    function test_EditPost() public {
        string[] memory tags = new string[](0);
        blog.createPost("Original", "QmOld", false, tags);

        string[] memory newTags = new string[](1);
        newTags[0] = "updated";
        blog.editPost(0, "Edited", "QmNew", true, newTags);

        (string memory title, string memory cid, bool isPrivate, , , , , string[] memory postTags) = blog.getPost(0);
        assertEq(title, "Edited");
        assertEq(cid, "QmNew");
        assertTrue(isPrivate);
        assertEq(postTags.length, 1);
        assertEq(postTags[0], "updated");
    }

    function test_EditPostUpdatesTimestamp() public {
        string[] memory tags = new string[](0);
        blog.createPost("Test", "QmCID", false, tags);

        vm.warp(block.timestamp + 100);
        blog.editPost(0, "Test2", "QmCID2", false, tags);

        (, , , , , uint48 createdAt, uint48 updatedAt, ) = blog.getPost(0);
        assertGt(updatedAt, createdAt);
    }

    function test_RevertEditDeletedPost() public {
        string[] memory tags = new string[](0);
        blog.createPost("Test", "QmCID", false, tags);
        blog.deletePost(0);

        vm.expectRevert(BlogRegistry.PostAlreadyDeleted.selector);
        blog.editPost(0, "Edited", "QmNew", false, tags);
    }

    // ─── Delete Post ─────────────────────────────────────────────────────

    function test_DeletePost() public {
        string[] memory tags = new string[](0);
        blog.createPost("Test", "QmCID", false, tags);
        blog.deletePost(0);

        (, , , , bool deleted, , , ) = blog.getPost(0);
        assertTrue(deleted);
    }

    function test_RevertDeleteNonexistent() public {
        vm.expectRevert(BlogRegistry.PostNotFound.selector);
        blog.deletePost(99);
    }

    function test_RevertDoubleDelete() public {
        string[] memory tags = new string[](0);
        blog.createPost("Test", "QmCID", false, tags);
        blog.deletePost(0);

        vm.expectRevert(BlogRegistry.PostAlreadyDeleted.selector);
        blog.deletePost(0);
    }

    // ─── Pin Post ────────────────────────────────────────────────────────

    function test_TogglePin() public {
        string[] memory tags = new string[](0);
        blog.createPost("Test", "QmCID", false, tags);

        blog.togglePin(0);
        (, , , bool pinned, , , , ) = blog.getPost(0);
        assertTrue(pinned);

        blog.togglePin(0);
        (, , , pinned, , , , ) = blog.getPost(0);
        assertFalse(pinned);
    }

    // ─── Writer Management ───────────────────────────────────────────────

    function test_AddWriter() public {
        blog.addWriter(writer);
        assertTrue(blog.writers(writer));
    }

    function test_WriterCanCreatePost() public {
        blog.addWriter(writer);
        string[] memory tags = new string[](0);

        vm.prank(writer);
        uint256 id = blog.createPost("Writer Post", "QmWriter", false, tags);
        assertEq(id, 0);
    }

    function test_RemoveWriter() public {
        blog.addWriter(writer);
        blog.removeWriter(writer);
        assertFalse(blog.writers(writer));

        string[] memory tags = new string[](0);
        vm.prank(writer);
        vm.expectRevert(BlogRegistry.NotAuthorized.selector);
        blog.createPost("Nope", "QmNope", false, tags);
    }

    function test_RevertAddWriterNotOwner() public {
        vm.prank(random);
        vm.expectRevert(BlogRegistry.NotOwner.selector);
        blog.addWriter(writer);
    }

    function test_RevertAddZeroAddress() public {
        vm.expectRevert(BlogRegistry.ZeroAddress.selector);
        blog.addWriter(address(0));
    }

    // ─── Ownership ───────────────────────────────────────────────────────

    function test_TransferOwnership() public {
        blog.transferOwnership(writer);
        assertEq(blog.owner(), writer);
        assertTrue(blog.writers(writer));
    }

    function test_RevertTransferOwnershipNotOwner() public {
        vm.prank(random);
        vm.expectRevert(BlogRegistry.NotOwner.selector);
        blog.transferOwnership(random);
    }

    function test_RevertTransferToZeroAddress() public {
        vm.expectRevert(BlogRegistry.ZeroAddress.selector);
        blog.transferOwnership(address(0));
    }

    // ─── Batch Read ──────────────────────────────────────────────────────

    function test_GetPosts() public {
        string[] memory tags = new string[](0);
        blog.createPost("First", "QmFirst", false, tags);
        blog.createPost("Second", "QmSecond", true, tags);
        blog.createPost("Third", "QmThird", false, tags);

        (
            uint256[] memory ids,
            string[] memory titles,
            bool[] memory isPrivateFlags,
            ,
            ,
        ) = blog.getPosts(0, 10);

        assertEq(ids.length, 3);
        assertEq(titles[0], "First");
        assertEq(titles[1], "Second");
        assertFalse(isPrivateFlags[0]);
        assertTrue(isPrivateFlags[1]);
    }

    function test_GetPostsPagination() public {
        string[] memory tags = new string[](0);
        for (uint256 i = 0; i < 5; i++) {
            blog.createPost("Post", "QmCID", false, tags);
        }

        (uint256[] memory ids, , , , , ) = blog.getPosts(2, 2);
        assertEq(ids.length, 2);
        assertEq(ids[0], 2);
        assertEq(ids[1], 3);
    }

    function test_GetPostsOffsetBeyondTotal() public {
        (uint256[] memory ids, , , , , ) = blog.getPosts(100, 10);
        assertEq(ids.length, 0);
    }

    // ─── Multiple Posts ──────────────────────────────────────────────────

    function test_MultiplePostsIncrementId() public {
        string[] memory tags = new string[](0);
        uint256 id0 = blog.createPost("A", "QmA", false, tags);
        uint256 id1 = blog.createPost("B", "QmB", false, tags);
        uint256 id2 = blog.createPost("C", "QmC", false, tags);

        assertEq(id0, 0);
        assertEq(id1, 1);
        assertEq(id2, 2);
        assertEq(blog.getPostCount(), 3);
    }

    // ─── Fuzz Tests ──────────────────────────────────────────────────────

    function testFuzz_CreatePost(string calldata title, string calldata cid) public {
        vm.assume(bytes(title).length > 0 && bytes(title).length < 500);
        vm.assume(bytes(cid).length > 0 && bytes(cid).length < 200);
        string[] memory tags = new string[](0);
        uint256 id = blog.createPost(title, cid, false, tags);
        assertEq(id, 0);
        (string memory t, string memory c,,,,,,) = blog.getPost(0);
        assertEq(t, title);
        assertEq(c, cid);
    }

    function testFuzz_TagLimit(uint8 tagCount) public {
        tagCount = uint8(bound(tagCount, 0, 20));
        string[] memory tags = new string[](tagCount);
        for (uint256 i = 0; i < tagCount; i++) {
            tags[i] = "t";
        }
        if (tagCount > 10) {
            vm.expectRevert(BlogRegistry.TooManyTags.selector);
        }
        blog.createPost("Title", "QmCID", false, tags);
    }

    function testFuzz_GetPostsPagination(uint256 offset, uint256 limit) public {
        string[] memory tags = new string[](0);
        for (uint256 i = 0; i < 5; i++) {
            blog.createPost("Post", "QmCID", false, tags);
        }
        offset = bound(offset, 0, 100);
        limit = bound(limit, 1, 50);
        (uint256[] memory ids,,,,,) = blog.getPosts(offset, limit);
        if (offset >= 5) {
            assertEq(ids.length, 0);
        } else {
            uint256 expected = offset + limit > 5 ? 5 - offset : limit;
            assertEq(ids.length, expected);
        }
    }

    function testFuzz_UnauthorizedCreate(address caller) public {
        vm.assume(caller != address(this));
        string[] memory tags = new string[](0);
        vm.prank(caller);
        vm.expectRevert(BlogRegistry.NotAuthorized.selector);
        blog.createPost("Title", "QmCID", false, tags);
    }

    // ─── Edge Case Tests ─────────────────────────────────────────────────

    function test_CreatePostMaxTags() public {
        string[] memory tags = new string[](10);
        for (uint256 i = 0; i < 10; i++) tags[i] = "tag";
        uint256 id = blog.createPost("Title", "QmCID", false, tags);
        string[] memory t = blog.getPostTags(id);
        assertEq(t.length, 10);
    }

    function test_RevertGetPostAtLength() public {
        string[] memory tags = new string[](0);
        blog.createPost("A", "QmA", false, tags);
        vm.expectRevert(BlogRegistry.PostNotFound.selector);
        blog.getPost(1);
    }

    function test_EditPreservesCreatedAt() public {
        string[] memory tags = new string[](0);
        blog.createPost("A", "QmA", false, tags);
        (,,,,, uint48 created1,,) = blog.getPost(0);
        vm.warp(block.timestamp + 1000);
        blog.editPost(0, "B", "QmB", false, tags);
        (,,,,, uint48 created2, uint48 updated2,) = blog.getPost(0);
        assertEq(created1, created2);
        assertGt(updated2, created2);
    }

    function test_ReaddWriter() public {
        blog.addWriter(writer);
        blog.removeWriter(writer);
        blog.addWriter(writer);
        assertTrue(blog.writers(writer));
        string[] memory tags = new string[](0);
        vm.prank(writer);
        blog.createPost("OK", "QmOK", false, tags);
    }

    function test_TransferOwnershipOldOwnerStillWriter() public {
        blog.transferOwnership(writer);
        assertEq(blog.owner(), writer);
        assertTrue(blog.writers(address(this)));
    }

    // ─── Security Tests ──────────────────────────────────────────────────

    function testFuzz_OnlyOwnerTransfers(address caller) public {
        vm.assume(caller != address(this));
        vm.prank(caller);
        vm.expectRevert(BlogRegistry.NotOwner.selector);
        blog.transferOwnership(caller);
    }

    function testFuzz_OnlyOwnerManagesWriters(address caller) public {
        vm.assume(caller != address(this));
        vm.prank(caller);
        vm.expectRevert(BlogRegistry.NotOwner.selector);
        blog.addWriter(address(0x99));
    }
}
