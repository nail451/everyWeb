package org.alex.everyWeb.modules.api;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Общие настройки для всех виджетов.
 * Хранятся в корне ModuleEntity.settings.
 */
public class WidgetSettings {

    private Boolean hideBackground;
    private String alignment;

    public WidgetSettings() {
        this.hideBackground = false;
        this.alignment = "center-center";
    }

    @JsonCreator
    public WidgetSettings(
            @JsonProperty("hideBackground") Boolean hideBackground,
            @JsonProperty("alignment") String alignment
    ) {
        this.hideBackground = hideBackground != null ? hideBackground : false;
        this.alignment = alignment != null ? alignment : "center-center";
    }

    public Boolean getHideBackground() {
        return hideBackground;
    }

    public void setHideBackground(Boolean hideBackground) {
        this.hideBackground = hideBackground != null ? hideBackground : false;
    }

    public String getAlignment() {
        return alignment;
    }

    public void setAlignment(String alignment) {
        this.alignment = alignment != null ? alignment : "center-center";
    }

    @Override
    public String toString() {
        return "WidgetSettings{" +
                "hideBackground=" + hideBackground +
                ", alignment='" + alignment + '\'' +
                '}';
    }
}