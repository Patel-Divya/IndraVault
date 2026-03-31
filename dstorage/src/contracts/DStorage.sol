pragma solidity ^0.5.0;

contract DStorage {

    string public name = "DStorage";

    // Total number of files
    uint public fileCount = 0;

    // File structure
    struct File {
        uint fileId;
        string fileHash;
        uint fileSize;
        string fileType;
        string fileName;
        string fileDescription;
        uint uploadTime;
        address payable uploader;
    }

    // Mapping fileId => File
    mapping(uint => File) public files;

    // Mapping user => fileIds
    mapping(address => uint[]) public userFiles;

    // Prevent duplicate file uploads
    mapping(string => bool) public fileExists;

    // Event
    event FileUploaded(
        uint fileId,
        string fileHash,
        uint fileSize,
        string fileType,
        string fileName,
        string fileDescription,
        uint uploadTime,
        address payable uploader
    );

    constructor() public {}

    function uploadFile(
        string memory _fileHash,
        uint _fileSize,
        string memory _fileType,
        string memory _fileName,
        string memory _fileDescription
    ) public {

        require(bytes(_fileHash).length > 0, "File hash required");
        require(bytes(_fileType).length > 0, "File type required");
        require(bytes(_fileName).length > 0, "File name required");
        require(msg.sender != address(0), "Invalid sender");
        require(_fileSize > 0, "File size must be greater than 0");

        // Prevent duplicate file hashes
        require(!fileExists[_fileHash], "File already uploaded");

        fileCount++;

        files[fileCount] = File(
            fileCount,
            _fileHash,
            _fileSize,
            _fileType,
            _fileName,
            _fileDescription,
            now,
            msg.sender
        );

        // Save file ID for the user
        userFiles[msg.sender].push(fileCount);

        // Mark file hash as used
        fileExists[_fileHash] = true;

        emit FileUploaded(
            fileCount,
            _fileHash,
            _fileSize,
            _fileType,
            _fileName,
            _fileDescription,
            now,
            msg.sender
        );
    }

    // Get all file IDs uploaded by a user
    function getUserFiles(address user) public view returns (uint[] memory) {
        return userFiles[user];
    }

    event FileDeleted(uint fileId, string fileHash, address deletedBy);

    function deleteFile(uint _fileId) public {
        require(_fileId > 0 && _fileId <= fileCount, "Invalid file ID");
        require(bytes(files[_fileId].fileHash).length > 0, "File does not exist");

        File memory file = files[_fileId];

        require(file.uploader == msg.sender, "Not file owner");

        string memory hash = file.fileHash;

        // Remove from userFiles array
        uint[] storage userFileList = userFiles[msg.sender];
        for (uint i = 0; i < userFileList.length; i++) {
            if (userFileList[i] == _fileId) {
                userFileList[i] = userFileList[userFileList.length - 1];
                userFileList.pop();
                break;
            }
        }

        // Delete mappings
        delete files[_fileId];
        fileExists[hash] = false;

        emit FileDeleted(_fileId, hash, msg.sender);
    }
}