package org.alex.everyWeb.modules.impl.filemanager;

import org.alex.everyWeb.modules.impl.filemanager.dto.*;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.DirectoryStream;
import java.nio.file.Files;
import java.nio.file.LinkOption;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.nio.file.attribute.PosixFilePermissions;
import java.nio.file.attribute.BasicFileAttributes;
import java.nio.file.attribute.PosixFileAttributes;
import java.nio.file.attribute.PosixFilePermission;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service
public class FileService {

    private static final DateTimeFormatter ISO =
            DateTimeFormatter.ISO_OFFSET_DATE_TIME.withZone(ZoneId.systemDefault());

    // ===== ЛИСТИНГ =====
    public FileListDTO list(String pathStr) throws IOException {
        Path path = normalize(pathStr);
        if (!Files.exists(path)) throw new IOException("Путь не существует: " + path);
        if (!Files.isDirectory(path)) throw new IOException("Не директория: " + path);

        List<FileEntryDTO> entries = new ArrayList<>();
        try (DirectoryStream<Path> ds = Files.newDirectoryStream(path)) {
            for (Path p : ds) entries.add(toEntry(p));
        }
        entries.sort((a, b) -> {
            if (a.isDirectory() != b.isDirectory()) return a.isDirectory() ? -1 : 1;
            return a.getName().compareToIgnoreCase(b.getName());
        });

        FileListDTO dto = new FileListDTO();
        dto.setPath(path.toString());
        Path parent = path.getParent();
        dto.setParentPath(parent != null ? parent.toString() : null);
        dto.setEntries(entries);
        return dto;
    }

    // ===== ДЕРЕВО (только папки, 1 уровень) =====
    public List<TreeEntryDTO> tree(String pathStr) throws IOException {
        Path path = normalize(pathStr);
        if (!Files.isDirectory(path)) return Collections.emptyList();

        List<TreeEntryDTO> result = new ArrayList<>();
        try (DirectoryStream<Path> ds = Files.newDirectoryStream(path)) {
            for (Path p : ds) {
                if (!Files.isDirectory(p)) continue;
                if (Files.isSymbolicLink(p)) continue;
                TreeEntryDTO dto = new TreeEntryDTO();
                dto.setName(p.getFileName().toString());
                dto.setPath(p.toString());
                dto.setHasChildren(hasSubdirs(p));
                result.add(dto);
            }
        }
        result.sort(Comparator.comparing(TreeEntryDTO::getName, String.CASE_INSENSITIVE_ORDER));
        return result;
    }

    private boolean hasSubdirs(Path path) {
        try (DirectoryStream<Path> ds = Files.newDirectoryStream(path)) {
            for (Path p : ds) {
                if (Files.isDirectory(p) && !Files.isSymbolicLink(p)) return true;
            }
        } catch (IOException ignored) {}
        return false;
    }

    // ===== СВОЙСТВА =====
    public FilePropertiesDTO properties(String pathStr) throws IOException {
        Path path = normalize(pathStr);
        if (!Files.exists(path, LinkOption.NOFOLLOW_LINKS)) throw new IOException("Путь не существует: " + path);

        FilePropertiesDTO dto = new FilePropertiesDTO();
        dto.setName(path.getFileName() != null ? path.getFileName().toString() : path.toString());
        dto.setPath(path.toString());
        dto.setDirectory(Files.isDirectory(path));
        dto.setSymlink(Files.isSymbolicLink(path));

        if (Files.isSymbolicLink(path)) {
            try { dto.setSymlinkTarget(Files.readSymbolicLink(path).toString()); }
            catch (IOException ignored) {}
        }

        BasicFileAttributes attrs;
        try {
            attrs = Files.readAttributes(path, BasicFileAttributes.class, LinkOption.NOFOLLOW_LINKS);
        } catch (IOException e) {
            attrs = Files.readAttributes(path, BasicFileAttributes.class);
        }
        dto.setCreated(formatTime(attrs.creationTime().toInstant()));
        dto.setLastModified(formatTime(attrs.lastModifiedTime().toInstant()));
        dto.setLastAccessed(formatTime(attrs.lastAccessTime().toInstant()));

        if (Files.isDirectory(path)) {
            dto.setSize(-1);
            dto.setSizeFormatted("—");
            try (Stream<Path> s = Files.list(path)) {
                dto.setChildCount((int) s.count());
            } catch (IOException e) {
                dto.setChildCount(-1);
            }
        } else {
            long size = attrs.size();
            dto.setSize(size);
            dto.setSizeFormatted(formatSize(size));
            dto.setChildCount(-1);
        }

        try {
            PosixFileAttributes posix = Files.readAttributes(path, PosixFileAttributes.class, LinkOption.NOFOLLOW_LINKS);
            dto.setOwner(posix.owner().getName());
            dto.setGroup(posix.group().getName());
            dto.setPermissions(PosixFilePermissions.toString(posix.permissions()));
            dto.setPermissionsOctal(Integer.toOctalString(toOctal(posix.permissions())));
        } catch (Exception e) {
            dto.setOwner("—");
            dto.setGroup("—");
            dto.setPermissions("—");
            dto.setPermissionsOctal("—");
        }
        return dto;
    }

    private int toOctal(Set<PosixFilePermission> perms) {
        int r = 0;
        for (PosixFilePermission p : perms) {
            switch (p) {
                case OWNER_READ: r |= 0400; break;
                case OWNER_WRITE: r |= 0200; break;
                case OWNER_EXECUTE: r |= 0100; break;
                case GROUP_READ: r |= 0040; break;
                case GROUP_WRITE: r |= 0020; break;
                case GROUP_EXECUTE: r |= 0010; break;
                case OTHERS_READ: r |= 0004; break;
                case OTHERS_WRITE: r |= 0002; break;
                case OTHERS_EXECUTE: r |= 0001; break;
            }
        }
        return r;
    }

    // ===== РАЗМЕР ПАПКИ (рекурсивно) =====
    public long folderSize(String pathStr) throws IOException {
        Path path = normalize(pathStr);
        if (!Files.isDirectory(path)) return Files.size(path);
        final long[] total = {0};
        try (Stream<Path> s = Files.walk(path)) {
            s.forEach(p -> {
                if (Files.isRegularFile(p, LinkOption.NOFOLLOW_LINKS)) {
                    try { total[0] += Files.size(p); } catch (IOException ignored) {}
                }
            });
        }
        return total[0];
    }

    // ===== СОЗДАНИЕ (с вложенностью через /) =====
    public void create(String parentPathStr, String name, boolean isFolder) throws IOException {
        Path parent = normalize(parentPathStr);
        if (!Files.isDirectory(parent)) throw new IOException("Не директория: " + parent);
        if (name == null || name.isEmpty()) throw new IOException("Пустое имя");
        if (name.contains("\0")) throw new IOException("Недопустимое имя");
        if (name.startsWith("/") || name.contains("..")) throw new IOException("Недопустимое имя: " + name);

        String[] parts = name.split("/");
        Path current = parent;
        for (String part : parts) {
            String clean = part.trim();
            if (clean.isEmpty()) continue;
            current = current.resolve(clean);
        }

        if (isFolder) {
            Files.createDirectories(current);
        } else {
            if (current.getParent() != null) Files.createDirectories(current.getParent());
            Files.createFile(current);
        }
    }

    // ===== ПЕРЕИМЕНОВАНИЕ =====
    public void rename(String pathStr, String newName) throws IOException {
        Path path = normalize(pathStr);
        if (!Files.exists(path, LinkOption.NOFOLLOW_LINKS)) throw new IOException("Путь не существует");
        if (newName == null || newName.isEmpty() || newName.contains("/")
                || newName.contains("..") || newName.contains("\0")) {
            throw new IOException("Недопустимое имя");
        }
        Path parent = path.getParent();
        if (parent == null) throw new IOException("Нельзя переименовать корень");
        Path target = parent.resolve(newName);
        if (Files.exists(target)) throw new IOException("Уже существует: " + newName);
        Files.move(path, target);
    }

    // ===== УДАЛЕНИЕ =====
    public void delete(List<String> paths) throws IOException {
        for (String p : paths) {
            Path path = normalize(p);
            if (!Files.exists(path, LinkOption.NOFOLLOW_LINKS)) continue;
            if (Files.isDirectory(path) && !Files.isSymbolicLink(path)) {
                try (Stream<Path> s = Files.walk(path)) {
                    List<Path> toDelete = s.sorted(Comparator.reverseOrder()).collect(Collectors.toList());
                    for (Path d : toDelete) Files.deleteIfExists(d);
                }
            } else {
                Files.deleteIfExists(path);
            }
        }
    }

    // ===== ЗАГРУЗКА =====
    public int upload(String pathStr, List<MultipartFile> files) throws IOException {
        Path dir = normalize(pathStr);
        if (!Files.isDirectory(dir)) throw new IOException("Не директория: " + dir);
        int count = 0;
        for (MultipartFile file : files) {
            if (file.isEmpty()) continue;
            String originalName = file.getOriginalFilename();
            if (originalName == null || originalName.contains("/") || originalName.contains("..")) continue;
            Path target = dir.resolve(originalName);
            try (InputStream in = file.getInputStream()) {
                Files.copy(in, target, StandardCopyOption.REPLACE_EXISTING);
                count++;
            }
        }
        return count;
    }

    // ===== НОРМАЛИЗАЦИЯ =====
    public Path normalize(String pathStr) {
        if (pathStr == null || pathStr.isEmpty()) pathStr = "/home/alsa";
        if (pathStr.contains("\0")) throw new IllegalArgumentException("Недопустимый путь");
        return Paths.get(pathStr).normalize();
    }

    // ===== ФОРМАТИРОВАНИЕ =====
    public String formatSize(long bytes) {
        if (bytes < 0) return "—";
        if (bytes < 1024) return bytes + " B";
        if (bytes < 1024 * 1024) return String.format("%.1f KB", bytes / 1024.0);
        if (bytes < 1024L * 1024 * 1024) return String.format("%.1f MB", bytes / (1024.0 * 1024));
        if (bytes < 1024L * 1024 * 1024 * 1024) return String.format("%.2f GB", bytes / (1024.0 * 1024 * 1024));
        return String.format("%.2f TB", bytes / (1024.0 * 1024 * 1024 * 1024));
    }

    private String formatTime(Instant instant) {
        return ISO.format(instant);
    }

    // ===== Path → FileEntryDTO =====
    private FileEntryDTO toEntry(Path p) {
        FileEntryDTO e = new FileEntryDTO();
        String name = p.getFileName() != null ? p.getFileName().toString() : p.toString();
        e.setName(name);
        e.setPath(p.toString());
        e.setHidden(name.startsWith("."));
        e.setSymlink(Files.isSymbolicLink(p));

        boolean isDir = Files.isDirectory(p);
        e.setDirectory(isDir);

        int dot = name.lastIndexOf('.');
        if (dot > 0 && !isDir) e.setExtension(name.substring(dot + 1).toLowerCase());

        if (isDir) {
            e.setSize(-1);
            e.setSizeFormatted("—");
        } else {
            try {
                long size = Files.size(p);
                e.setSize(size);
                e.setSizeFormatted(formatSize(size));
            } catch (IOException ex) {
                e.setSize(-1);
                e.setSizeFormatted("—");
            }
        }

        try {
            BasicFileAttributes attrs = Files.readAttributes(p, BasicFileAttributes.class, LinkOption.NOFOLLOW_LINKS);
            e.setLastModified(formatTime(attrs.lastModifiedTime().toInstant()));
        } catch (IOException ex) {
            e.setLastModified(null);
        }

        e.setIcon(getIcon(isDir, e.isSymlink(), e.getExtension()));
        return e;
    }

    private String getIcon(boolean isDir, boolean isSymlink, String ext) {
        if (isSymlink) return "🔗";
        if (isDir) return "📁";
        if (ext == null) return "📄";
        switch (ext) {
            case "txt": case "md": case "log": return "📝";
            case "pdf": return "📕";
            case "doc": case "docx": return "📘";
            case "xls": case "xlsx": case "csv": return "📗";
            case "ppt": case "pptx": return "📙";
            case "jpg": case "jpeg": case "png": case "gif": case "bmp": case "svg": case "webp": return "🖼️";
            case "mp3": case "wav": case "flac": case "ogg": case "m4a": return "🎵";
            case "mp4": case "avi": case "mkv": case "mov": case "webm": return "🎬";
            case "zip": case "tar": case "gz": case "bz2": case "xz": case "7z": case "rar": return "📦";
            case "java": case "js": case "ts": case "py": case "rb": case "go": case "rs":
            case "c": case "cpp": case "h": case "cs": case "php": return "💻";
            case "html": case "htm": case "xml": case "json": case "yml": case "yaml": return "🌐";
            case "sh": case "bash": case "zsh": return "⚙️";
            case "jar": case "war": case "ear": return "☕";
            case "exe": case "msi": case "deb": case "rpm": case "apk": return "📦";
            case "iso": return "💿";
            case "sql": case "db": case "sqlite": return "🗄️";
            default: return "📄";
        }
    }
}