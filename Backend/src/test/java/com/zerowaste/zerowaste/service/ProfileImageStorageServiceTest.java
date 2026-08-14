package com.zerowaste.zerowaste.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.nio.charset.StandardCharsets;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import com.zerowaste.zerowaste.exception.ApiException;
import com.zerowaste.zerowaste.service.ProfileImageStorageService.StoredImage;

class ProfileImageStorageServiceTest {

    private final ProfileImageStorageService service = new ProfileImageStorageService();

    @Test
    void readsUploadedImageBytesAndContentType() {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "My Photo.png",
                "image/png",
                "sample-image-data".getBytes(StandardCharsets.UTF_8));

        StoredImage stored = service.readProfileImage(file);

        assertThat(stored.contentType()).isEqualTo("image/png");
        assertThat(stored.data()).isEqualTo("sample-image-data".getBytes(StandardCharsets.UTF_8));
    }

    @Test
    void rejectsEmptyFile() {
        MockMultipartFile empty = new MockMultipartFile("file", "empty.png", "image/png", new byte[0]);

        assertThatThrownBy(() -> service.readProfileImage(empty))
                .isInstanceOf(ApiException.class);
    }

    @Test
    void rejectsNonImageContentType() {
        MockMultipartFile file = new MockMultipartFile(
                "file", "notes.txt", "text/plain", "hello".getBytes(StandardCharsets.UTF_8));

        assertThatThrownBy(() -> service.readProfileImage(file))
                .isInstanceOf(ApiException.class);
    }
}
