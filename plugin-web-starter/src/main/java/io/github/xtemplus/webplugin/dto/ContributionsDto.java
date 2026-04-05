package io.github.xtemplus.webplugin.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class ContributionsDto {

    private Boolean menu;
    private Boolean routes;
    private Boolean slots;
    private Boolean buttons;
    private Boolean assetInjection;

    public Boolean getMenu() {
        return menu;
    }

    public void setMenu(Boolean menu) {
        this.menu = menu;
    }

    public Boolean getRoutes() {
        return routes;
    }

    public void setRoutes(Boolean routes) {
        this.routes = routes;
    }

    public Boolean getSlots() {
        return slots;
    }

    public void setSlots(Boolean slots) {
        this.slots = slots;
    }

    public Boolean getButtons() {
        return buttons;
    }

    public void setButtons(Boolean buttons) {
        this.buttons = buttons;
    }

    public Boolean getAssetInjection() {
        return assetInjection;
    }

    public void setAssetInjection(Boolean assetInjection) {
        this.assetInjection = assetInjection;
    }
}
