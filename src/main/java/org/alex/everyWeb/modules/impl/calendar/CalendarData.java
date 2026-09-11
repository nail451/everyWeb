package org.alex.everyWeb.modules.impl.calendar;

public class CalendarData {
    private String firstDayOfWeek = "MONDAY";
    private boolean linkedToNotes = false;
    private boolean showProductionCalendar = false;

    public CalendarData() {}

    public String getFirstDayOfWeek() { return firstDayOfWeek; }
    public void setFirstDayOfWeek(String firstDayOfWeek) {
        this.firstDayOfWeek = firstDayOfWeek != null ? firstDayOfWeek : "MONDAY";
    }

    public boolean isLinkedToNotes() { return linkedToNotes; }
    public void setLinkedToNotes(boolean linkedToNotes) { this.linkedToNotes = linkedToNotes; }

    public boolean isShowProductionCalendar() { return showProductionCalendar; }
    public void setShowProductionCalendar(boolean showProductionCalendar) {
        this.showProductionCalendar = showProductionCalendar;
    }
}