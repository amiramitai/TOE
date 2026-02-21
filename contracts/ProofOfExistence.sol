// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title ProofOfExistence
 * @author Amir Benjamin Amitay
 * @notice Immutable on-chain proof-of-existence for academic publications.
 *         Records SHA-256 document hashes, IPFS CIDs, and timestamps.
 */
contract ProofOfExistence {

    struct Document {
        bytes32  contentHash;    // SHA-256 hash of the file
        string   ipfsCid;        // IPFS Content Identifier
        string   title;          // Human-readable title
        string   author;         // Author name
        uint256  timestamp;      // Block timestamp at registration
        address  registrant;     // Address that registered the document
    }

    /// @notice Mapping from content hash to Document record
    mapping(bytes32 => Document) public documents;

    /// @notice Array of all registered hashes (for enumeration)
    bytes32[] public registeredHashes;

    /// @notice Emitted when a new document is registered
    event DocumentRegistered(
        bytes32 indexed contentHash,
        string  ipfsCid,
        string  title,
        string  author,
        uint256 timestamp,
        address indexed registrant
    );

    /// @notice Register a document's proof-of-existence on-chain
    /// @param _contentHash SHA-256 hash of the document (as bytes32)
    /// @param _ipfsCid     IPFS CID where the document is pinned
    /// @param _title       Title of the document
    /// @param _author      Author of the document
    function registerDocument(
        bytes32 _contentHash,
        string calldata _ipfsCid,
        string calldata _title,
        string calldata _author
    ) external {
        require(documents[_contentHash].timestamp == 0, "Document already registered");
        require(_contentHash != bytes32(0), "Invalid hash");

        documents[_contentHash] = Document({
            contentHash: _contentHash,
            ipfsCid:     _ipfsCid,
            title:       _title,
            author:      _author,
            timestamp:   block.timestamp,
            registrant:  msg.sender
        });

        registeredHashes.push(_contentHash);

        emit DocumentRegistered(
            _contentHash,
            _ipfsCid,
            _title,
            _author,
            block.timestamp,
            msg.sender
        );
    }

    /// @notice Verify whether a document hash has been registered
    /// @param _contentHash The SHA-256 hash to look up
    /// @return exists      True if the hash is registered
    /// @return timestamp   The block timestamp of registration (0 if not found)
    /// @return ipfsCid     The IPFS CID (empty if not found)
    function verifyDocument(bytes32 _contentHash)
        external
        view
        returns (bool exists, uint256 timestamp, string memory ipfsCid)
    {
        Document storage doc = documents[_contentHash];
        if (doc.timestamp == 0) {
            return (false, 0, "");
        }
        return (true, doc.timestamp, doc.ipfsCid);
    }

    /// @notice Get the total number of registered documents
    function getDocumentCount() external view returns (uint256) {
        return registeredHashes.length;
    }
}
