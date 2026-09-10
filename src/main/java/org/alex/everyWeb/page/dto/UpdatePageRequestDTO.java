package org.alex.everyWeb.page.dto;

public class UpdatePageRequestDTO {
    private String name;
    private String password;
    private Boolean removePassword;

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public Boolean getRemovePassword() {
        return removePassword;
    }

    public void setRemovePassword(Boolean removePassword) {
        this.removePassword = removePassword;
    }
}
