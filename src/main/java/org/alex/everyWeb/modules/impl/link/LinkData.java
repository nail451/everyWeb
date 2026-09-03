package org.alex.everyWeb.modules.impl.link;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;

public class LinkData {

    private Integer iconSize;
    private Integer fontSize;
    private Integer blurAmount;
    private Integer bgDarkness;

    public LinkData() {
        this.iconSize = 28;
        this.fontSize = 12;
        this.blurAmount = 15;
        this.bgDarkness = 0;
    }

    @JsonCreator
    public LinkData(
            @JsonProperty("iconSize") Integer iconSize,
            @JsonProperty("fontSize") Integer fontSize,
            @JsonProperty("blurAmount") Integer blurAmount,
            @JsonProperty("bgDarkness") Integer bgDarkness
    ) {
        this.iconSize = iconSize != null ? iconSize : 28;
        this.fontSize = fontSize != null ? fontSize : 12;
        this.blurAmount = blurAmount != null ? Math.max(0, Math.min(100, blurAmount)) : 15;
        this.bgDarkness = bgDarkness != null ? Math.max(-50, Math.min(50, bgDarkness)) : 0;
    }

    public Integer getIconSize() { return iconSize; }
    public void setIconSize(Integer iconSize) { this.iconSize = iconSize != null ? iconSize : 28; }

    public Integer getFontSize() { return fontSize; }
    public void setFontSize(Integer fontSize) { this.fontSize = fontSize != null ? fontSize : 12; }

    public Integer getBlurAmount() { return blurAmount; }
    public void setBlurAmount(Integer blurAmount) { this.blurAmount = blurAmount != null ? Math.max(0, Math.min(100, blurAmount)) : 15; }

    public Integer getBgDarkness() { return bgDarkness; }
    public void setBgDarkness(Integer bgDarkness) { this.bgDarkness = bgDarkness != null ? Math.max(-50, Math.min(50, bgDarkness)) : 0; }

    @JsonIgnore
    public boolean isValid() {
        return iconSize != null && iconSize >= 16 && iconSize <= 100 &&
                fontSize != null && fontSize >= 8 && fontSize <= 24 &&
                blurAmount != null && blurAmount >= 0 && blurAmount <= 100 &&
                bgDarkness != null && bgDarkness >= -50 && bgDarkness <= 50;
    }

    @Override
    public String toString() {
        return "LinkData{" +
                "iconSize=" + iconSize +
                ", fontSize=" + fontSize +
                ", blurAmount=" + blurAmount +
                ", bgDarkness=" + bgDarkness +
                '}';
    }
}