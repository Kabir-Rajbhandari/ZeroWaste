package com.zerowaste.zerowaste.service;

import java.io.IOException;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.zerowaste.zerowaste.exception.ApiException;

/**
 * Validates and reads uploaded profile-image files into memory so they can
 * be persisted straight into the database (see User.profileImageData) rather
 * than written to the local disk. Storing on local disk doesn't survive
 * redeploys/restarts and doesn't work once you run more than one app
 * instance, so the image bytes themselves are the source of truth in the DB.
 */
@Service
public class ProfileImageStorageService {

    private static final long MAX_FILE_SIZE_BYTES = 5L * 1024 * 1024; // 5MB

    /** In-memory representation of an uploaded image, ready to be saved to the DB. */
    public record StoredImage(byte[] data, String contentType) {
    }

    public StoredImage readProfileImage(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ApiException("Profile image file is required.", HttpStatus.BAD_REQUEST);
        }
        if (file.getSize() > MAX_FILE_SIZE_BYTES) {
            throw new ApiException("Profile image must be smaller than 5MB.", HttpStatus.BAD_REQUEST);
        }

        String contentType = file.getContentType();
        if (contentType == null || !contentType.toLowerCase().startsWith("image/")) {
            throw new ApiException("Only image files are allowed for profile pictures.", HttpStatus.BAD_REQUEST);
        }

        try {
            return new StoredImage(file.getBytes(), contentType);
        } catch (IOException e) {
            throw new IllegalStateException("Unable to read profile image.", e);
        }
    }
}
