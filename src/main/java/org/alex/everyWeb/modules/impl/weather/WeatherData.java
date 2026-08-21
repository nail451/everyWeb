package org.alex.everyWeb.modules.impl.weather;

public class WeatherData {
    private String city = "Moscow";
    private String units = "metric";
    private boolean showWind = true;
    private boolean showHumidity = true;
    private boolean showPressure = true;

    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }

    public String getUnits() { return units; }
    public void setUnits(String units) { this.units = units; }

    public boolean isShowWind() { return showWind; }
    public void setShowWind(boolean showWind) { this.showWind = showWind; }

    public boolean isShowHumidity() { return showHumidity; }
    public void setShowHumidity(boolean showHumidity) { this.showHumidity = showHumidity; }

    public boolean isShowPressure() { return showPressure; }
    public void setShowPressure(boolean showPressure) { this.showPressure = showPressure; }
}