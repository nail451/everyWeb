package org.alex.everyWeb.modules.impl.filemanager;

import java.io.IOException;
import java.nio.file.Path;

public class FileConflictException extends IOException {
    private final String conflictingName;
    private final String existingPath;

    public FileConflictException(String name, Path path) {
        super("Уже существует: " + name);
        this.conflictingName = name;
        this.existingPath = path != null ? path.toString() : null;
    }

    public String getConflictingName() { return conflictingName; }
    public String getExistingPath() { return existingPath; }
}