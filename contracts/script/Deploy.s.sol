// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {BlogRegistry} from "../src/BlogRegistry.sol";

contract DeployScript is Script {
    function run() public {
        vm.startBroadcast();

        BlogRegistry blog = new BlogRegistry();
        console.log("BlogRegistry deployed at:", address(blog));
        console.log("Owner:", blog.owner());

        vm.stopBroadcast();
    }
}
