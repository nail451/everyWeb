package org.alex.everyWeb.modules.impl.filemanager;

import org.alex.everyWeb.common.logging.SafeLog;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/files")
public class FileController {

    @Autowired
    private FileService fileService;

    @GetMapping("/list")
    public ResponseEntity<?> list(@RequestParam String path) {
        try { return ResponseEntity.ok(fileService.list(path)); }
        catch (Exception e) {
            SafeLog.error("files/list error: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/tree")
    public ResponseEntity<?> tree(@RequestParam String path) {
        try { return ResponseEntity.ok(fileService.tree(path)); }
        catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/properties")
    public ResponseEntity<?> properties(@RequestParam String path) {
        try { return ResponseEntity.ok(fileService.properties(path)); }
        catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/folder-size")
    public ResponseEntity<?> folderSize(@RequestParam String path) {
        try {
            long size = fileService.folderSize(path);
            return ResponseEntity.ok(Map.of("size", size, "sizeFormatted", fileService.formatSize(size)));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/download")
    public ResponseEntity<?> download(@RequestParam String path) {
        try {
            Path p = fileService.normalize(path);
            if (!Files.exists(p) || Files.isDirectory(p)) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", "Не файл"));
            }
            Resource resource = new FileSystemResource(p);
            String filename = p.getFileName().toString();
            String encoded = URLEncoder.encode(filename, StandardCharsets.UTF_8).replace("+", "%20");
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION,
                            "attachment; filename=\"" + filename + "\"; filename*=UTF-8''" + encoded)
                    .contentType(MediaType.APPLICATION_OCTET_STREAM)
                    .contentLength(Files.size(p))
                    .body(resource);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/upload")
    public ResponseEntity<?> upload(@RequestParam String path,
                                    @RequestParam("files") List<MultipartFile> files) {
        try {
            int count = fileService.upload(path, files);
            return ResponseEntity.ok(Map.of("uploaded", count));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/create")
    public ResponseEntity<?> create(@RequestBody Map<String, Object> req) {
        try {
            String path = (String) req.get("path");
            String name = (String) req.get("name");
            boolean isFolder = Boolean.TRUE.equals(req.get("isFolder"));
            fileService.create(path, name, isFolder);
            return ResponseEntity.ok(Map.of("success", true));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/rename")
    public ResponseEntity<?> rename(@RequestBody Map<String, String> req) {
        try {
            fileService.rename(req.get("path"), req.get("newName"));
            return ResponseEntity.ok(Map.of("success", true));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/delete")
    public ResponseEntity<?> delete(@RequestBody Map<String, Object> req) {
        try {
            @SuppressWarnings("unchecked")
            List<String> paths = (List<String>) req.get("paths");
            fileService.delete(paths);
            return ResponseEntity.ok(Map.of("success", true));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/copy")
    public ResponseEntity<?> copy(@RequestBody Map<String, Object> req) {
        try {
            @SuppressWarnings("unchecked")
            List<String> sources = (List<String>) req.get("sources");
            String destination = (String) req.get("destination");
            boolean overwrite = Boolean.TRUE.equals(req.get("overwrite"));
            boolean autoRename = Boolean.TRUE.equals(req.get("autoRename"));

            fileService.copy(sources, destination, overwrite, autoRename);
            return ResponseEntity.ok(Map.of("success", true));
        } catch (FileConflictException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                    "error", "conflict",
                    "conflictingName", e.getConflictingName(),
                    "existingPath", e.getExistingPath()
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/move")
    public ResponseEntity<?> move(@RequestBody Map<String, Object> req) {
        try {
            @SuppressWarnings("unchecked")
            List<String> sources = (List<String>) req.get("sources");
            String destination = (String) req.get("destination");
            boolean overwrite = Boolean.TRUE.equals(req.get("overwrite"));
            boolean autoRename = Boolean.TRUE.equals(req.get("autoRename"));

            fileService.move(sources, destination, overwrite, autoRename);
            return ResponseEntity.ok(Map.of("success", true));
        } catch (FileConflictException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                    "error", "conflict",
                    "conflictingName", e.getConflictingName(),
                    "existingPath", e.getExistingPath()
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", e.getMessage()));
        }
    }
}