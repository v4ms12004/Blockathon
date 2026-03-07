// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract BlockBadge {
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
        string badgeTier;  // "gold", "silver", "bronze", ""
        string badgeCID;   // IPFS CID from Pinata
    }

    // ── State variables ───────────────────────────────────────
    uint256 public eventCount;

    // eventId => Event
    mapping(uint256 => Event) public events;

    // eventId => checkpointId => exists
    mapping(uint256 => mapping(uint256 => bool)) public checkpoints;

    // eventId => participantAddress => Participant
    mapping(uint256 => mapping(address => Participant)) public participants;

    // eventId => checkpointId => participantAddress => checked in
    mapping(uint256 => mapping(uint256 => mapping(address => bool))) public checkedIn;

    // eventId => list of participant addresses
    mapping(uint256 => address[]) public participantList;

    // ── Events (Solidity events for frontend listening) ───────
    event EventCreated(uint256 indexed eventId, string eventName, address organizer);
    event CheckpointCreated(uint256 indexed eventId, uint256 checkpointId);
    event CheckedIn(uint256 indexed eventId, uint256 checkpointId, address participant, uint256 newBalance);
    event BadgeClaimed(uint256 indexed eventId, address participant, string tier, string cid);
    event EventEnded(uint256 indexed eventId);

    // ── Modifiers ─────────────────────────────────────────────
    modifier onlyOrganizer(uint256 eventId) {
        require(msg.sender == events[eventId].organizer, "Not the organizer");
        _;
    }

    modifier eventActive(uint256 eventId) {
        require(events[eventId].isActive, "Event is not active");
        _;
    }

    // ── Functions ─────────────────────────────────────────────

    // Organizer creates an event
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

        // Auto-create checkpoints
        for (uint256 i = 0; i < totalCheckpoints; i++) {
            checkpoints[eventId][i] = true;
            emit CheckpointCreated(eventId, i);
        }

        emit EventCreated(eventId, eventName, msg.sender);
        return eventId;
    }

    // Participant checks in at a checkpoint
    function checkIn(
        uint256 eventId,
        uint256 checkpointId
    ) external eventActive(eventId) {
        require(checkpoints[eventId][checkpointId], "Invalid checkpoint");
        require(
            !checkedIn[eventId][checkpointId][msg.sender],
            "Already checked in at this checkpoint"
        );

        // Mark as checked in
        checkedIn[eventId][checkpointId][msg.sender] = true;

        // Add to participant list if first time
        if (participants[eventId][msg.sender].checkinCount == 0) {
            participantList[eventId].push(msg.sender);
        }

        // Award tokens
        participants[eventId][msg.sender].tokenBalance += events[eventId].tokensPerCheckin;
        participants[eventId][msg.sender].checkinCount += 1;

        emit CheckedIn(
            eventId,
            checkpointId,
            msg.sender,
            participants[eventId][msg.sender].tokenBalance
        );
    }

    // Participant claims their badge
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

        participants[eventId][msg.sender].hasClaimedBadge = true;
        participants[eventId][msg.sender].badgeTier = tier;
        participants[eventId][msg.sender].badgeCID = badgeCID;

        emit BadgeClaimed(eventId, msg.sender, tier, badgeCID);
    }

    // Organizer ends the event
    function endEvent(uint256 eventId) external onlyOrganizer(eventId) {
        events[eventId].isActive = false;
        emit EventEnded(eventId);
    }

    // ── View functions ────────────────────────────────────────

    // Get participant details
    function getParticipant(
        uint256 eventId,
        address participant
    ) external view returns (
        uint256 tokenBalance,
        uint256 checkinCount,
        bool hasClaimedBadge,
        string memory badgeTier,
        string memory badgeCID
    ) {
        Participant memory p = participants[eventId][participant];
        return (
            p.tokenBalance,
            p.checkinCount,
            p.hasClaimedBadge,
            p.badgeTier,
            p.badgeCID
        );
    }

    // Get event details
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

    // Check if participant already checked in at a checkpoint
    function hasCheckedIn(
        uint256 eventId,
        uint256 checkpointId,
        address participant
    ) external view returns (bool) {
        return checkedIn[eventId][checkpointId][participant];
    }

    // Get all participants for an event
    function getParticipants(
        uint256 eventId
    ) external view returns (address[] memory) {
        return participantList[eventId];
    }
}