// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract BlockBadge is ERC721URIStorage, Ownable {

    // ── Structs ───────────────────────────────────────────────
    struct Event {
        address organizer;
        uint256 totalParticipants;
        uint256 totalCheckpoints;
        uint256 tokensPerCheckin;
        uint256 goldThreshold;
        uint256 silverThreshold;
        uint256 bronzeThreshold;
        bool isActive;
        string eventName;
    }

    struct Participant {
        uint256 tokenBalance;
        uint256 checkinCount;
        bool hasClaimedBadge;
        string badgeTier;
        string badgeCID;
        uint256 nftTokenId;
    }

    // ── State variables ───────────────────────────────────────
    uint256 public eventCount;
    uint256 private _tokenIdCounter;

    mapping(uint256 => Event) public events;
    mapping(uint256 => mapping(uint256 => bool)) public checkpoints;
    mapping(uint256 => mapping(address => Participant)) public participants;
    mapping(uint256 => mapping(uint256 => mapping(address => bool))) public checkedIn;
    mapping(uint256 => address[]) public participantList;

    // ── Events ────────────────────────────────────────────────
    //    event EventCreated(uint256 indexed eventId, string eventName, address organizer, uint256 goldThreshold, uint256 silverThreshold, uint256 bronzeThreshold);
    event EventCreated(uint256 indexed eventId, string eventName, address organizer);
    event CheckpointCreated(uint256 indexed eventId, uint256 checkpointId);
    event CheckedIn(uint256 indexed eventId, uint256 checkpointId, address participant, uint256 newBalance);
    event BadgeClaimed(uint256 indexed eventId, address participant, string tier, string cid, uint256 tokenId);
    event EventEnded(uint256 indexed eventId);

    // ── Constructor ───────────────────────────────────────────
    constructor() ERC721("BlockBadge", "BLKBDG") Ownable(msg.sender) {}

    // ── Modifiers ─────────────────────────────────────────────
    modifier onlyOrganizer(uint256 eventId) {
        require(msg.sender == events[eventId].organizer, "Not the organizer");
        _;
    }

    modifier eventActive(uint256 eventId) {
        require(events[eventId].isActive, "Event is not active");
        _;
    }

    // ── Create Event ──────────────────────────────────────────
    function createEvent(
        string memory eventName,
        uint256 totalParticipants,
        uint256 totalCheckpoints,
        uint256 tokensPerCheckin,
        uint256 goldThreshold,
        uint256 silverThreshold,
        uint256 bronzeThreshold
    ) external returns (uint256) {
        require(totalParticipants > 0, "Need at least 1 participant");
        require(totalCheckpoints > 0, "Need at least 1 checkpoint");
        require(goldThreshold > silverThreshold, "Gold must be higher than silver");
        require(silverThreshold > bronzeThreshold, "Silver must be higher than bronze");

        uint256 eventId = eventCount++;

        events[eventId] = Event({
            organizer: msg.sender,
            totalParticipants: totalParticipants,
            totalCheckpoints: totalCheckpoints,
            tokensPerCheckin: tokensPerCheckin,
            goldThreshold: goldThreshold,
            silverThreshold: silverThreshold,
            bronzeThreshold: bronzeThreshold,
            isActive: true,
            eventName: eventName
        });

        for (uint256 i = 0; i < totalCheckpoints; i++) {
            checkpoints[eventId][i] = true;
            emit CheckpointCreated(eventId, i);
        }

        emit EventCreated(eventId, eventName, msg.sender);
        return eventId;
    }

    // ── Check In ──────────────────────────────────────────────
    function checkIn(
        uint256 eventId,
        uint256 checkpointId
    ) external eventActive(eventId) {
        require(checkpoints[eventId][checkpointId], "Invalid checkpoint");
        require(
            !checkedIn[eventId][checkpointId][msg.sender],
            "Already checked in at this checkpoint"
        );

        checkedIn[eventId][checkpointId][msg.sender] = true;

        if (participants[eventId][msg.sender].checkinCount == 0) {
            participantList[eventId].push(msg.sender);
        }

        participants[eventId][msg.sender].tokenBalance += events[eventId].tokensPerCheckin;
        participants[eventId][msg.sender].checkinCount += 1;

        emit CheckedIn(
            eventId,
            checkpointId,
            msg.sender,
            participants[eventId][msg.sender].tokenBalance
        );
    }

    // ── Claim Badge + Mint NFT ────────────────────────────────
    function claimBadge(
        uint256 eventId,
        string memory badgeCID
    ) external {
        require(!events[eventId].isActive, "Event must be ended first");
        require(
            !participants[eventId][msg.sender].hasClaimedBadge,
            "Badge already claimed"
        );

        uint256 balance = participants[eventId][msg.sender].tokenBalance;
        Event memory ev = events[eventId];

        string memory tier;
        if (balance >= ev.goldThreshold) {
            tier = "gold";
        } else if (balance >= ev.silverThreshold) {
            tier = "silver";
        } else if (balance >= ev.bronzeThreshold) {
            tier = "bronze";
        } else {
            revert("Not enough tokens to claim any badge");
        }

        // Mint ERC-721 NFT to participant
        uint256 newTokenId = _tokenIdCounter++;
        _safeMint(msg.sender, newTokenId);

        // Set token URI to IPFS CID
        string memory tokenURI = string(abi.encodePacked("ipfs://", badgeCID));
        _setTokenURI(newTokenId, tokenURI);

        // Update participant record
        participants[eventId][msg.sender].hasClaimedBadge = true;
        participants[eventId][msg.sender].badgeTier = tier;
        participants[eventId][msg.sender].badgeCID = badgeCID;
        participants[eventId][msg.sender].nftTokenId = newTokenId;

        emit BadgeClaimed(eventId, msg.sender, tier, badgeCID, newTokenId);
    }

    // ── End Event ─────────────────────────────────────────────
    function endEvent(uint256 eventId) external onlyOrganizer(eventId) {
        events[eventId].isActive = false;
        emit EventEnded(eventId);
    }

    // ── View Functions ────────────────────────────────────────
    function getParticipant(
        uint256 eventId,
        address participant
    ) external view returns (
        uint256 tokenBalance,
        uint256 checkinCount,
        bool hasClaimedBadge,
        string memory badgeTier,
        string memory badgeCID,
        uint256 nftTokenId
    ) {
        Participant memory p = participants[eventId][participant];
        return (
            p.tokenBalance,
            p.checkinCount,
            p.hasClaimedBadge,
            p.badgeTier,
            p.badgeCID,
            p.nftTokenId
        );
    }

    function getEvent(uint256 eventId) external view returns (
        address organizer,
        string memory eventName,
        uint256 totalParticipants,
        uint256 totalCheckpoints,
        uint256 tokensPerCheckin,
        uint256 goldThreshold,
        uint256 silverThreshold,
        uint256 bronzeThreshold,
        bool isActive
    ) {
        Event memory ev = events[eventId];
        return (
            ev.organizer,
            ev.eventName,
            ev.totalParticipants,
            ev.totalCheckpoints,
            ev.tokensPerCheckin,
            ev.goldThreshold,
            ev.silverThreshold,
            ev.bronzeThreshold,
            ev.isActive
        );
    }

    function hasCheckedIn(
        uint256 eventId,
        uint256 checkpointId,
        address participant
    ) external view returns (bool) {
        return checkedIn[eventId][checkpointId][participant];
    }

    function getParticipants(
        uint256 eventId
    ) external view returns (address[] memory) {
        return participantList[eventId];
    }

    // Get NFT token URI
    function getNFTTokenURI(
        uint256 tokenId
    ) external view returns (string memory) {
        return tokenURI(tokenId);
    }
}