package org.alex.everyWeb.modules.impl.torrent.dto;

public class TorrentFileDTO {

    private int index;
    private String name;               // полный путь внутри торрента
    private long size;
    private double progress;           // 0.0 - 1.0
    private int priority;              // 0, 1, 6, 7
    private boolean seed;              // is_seed
    private long pieceRangeStart;
    private long pieceRangeEnd;
    private int availability;          // -1 = unknown

    public TorrentFileDTO() {
    }

    public int getIndex() {
        return index;
    }

    public void setIndex(int index) {
        this.index = index;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public long getSize() {
        return size;
    }

    public void setSize(long size) {
        this.size = size;
    }

    public double getProgress() {
        return progress;
    }

    public void setProgress(double progress) {
        this.progress = progress;
    }

    public int getPriority() {
        return priority;
    }

    public void setPriority(int priority) {
        this.priority = priority;
    }

    public boolean isSeed() {
        return seed;
    }

    public void setSeed(boolean seed) {
        this.seed = seed;
    }

    public long getPieceRangeStart() {
        return pieceRangeStart;
    }

    public void setPieceRangeStart(long pieceRangeStart) {
        this.pieceRangeStart = pieceRangeStart;
    }

    public long getPieceRangeEnd() {
        return pieceRangeEnd;
    }

    public void setPieceRangeEnd(long pieceRangeEnd) {
        this.pieceRangeEnd = pieceRangeEnd;
    }

    public int getAvailability() {
        return availability;
    }

    public void setAvailability(int availability) {
        this.availability = availability;
    }
}