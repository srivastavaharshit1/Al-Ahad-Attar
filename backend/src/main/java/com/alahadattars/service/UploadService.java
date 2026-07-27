package com.alahadattars.service;

import org.springframework.web.multipart.MultipartFile;

public interface UploadService {

    /**
     * Uploads a file to the storage medium.
     *
     * @param file      The file to upload
     * @param directory The target directory/path
     * @return The stored file path or URL
     */
    String uploadFile(MultipartFile file, String directory);

    /**
     * Deletes a file from the storage medium.
     *
     * @param filePath The path or URL of the file to delete
     */
    void deleteFile(String filePath);
}
